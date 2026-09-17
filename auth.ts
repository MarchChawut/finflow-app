import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
  invitedEmails,
  families,
} from "@/lib/db/schema";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  // JWT strategy: /proxy.ts (Phase 1d) reads the session from the cookie
  // only, never hitting the DB — required for it to run on every route
  // cheaply. The adapter is still used for createUser/linkAccount on the
  // signIn write path.
  session: { strategy: "jwt" },
  callbacks: {
    // Multi-tenant sign-up: anyone with a Google account can sign in (no
    // email allowlist anymore — that gate is gone now that each family is
    // its own tenant instead of the whole app being one shared family). What
    // matters is which *family* a new user lands in, resolved here right
    // after the adapter creates their row and before sign-in completes:
    //   - an email with a pending invite (lib/actions/invites.ts) joins that
    //     inviter's family as a MEMBER, and the invite is consumed
    //   - anyone else gets a brand-new family and becomes its ADMIN (host)
    // A *returning* user already has a familyId, so this is a no-op for them.
    async signIn({ user }) {
      if (!user.email || !user.id) return false;
      const email = user.email.toLowerCase();

      const existing = await db.query.users.findFirst({
        where: eq(users.id, user.id),
        columns: { familyId: true },
      });
      if (!existing) return false; // adapter should have created the row by now
      if (existing.familyId) return true; // already resolved — returning user

      const invite = await db.query.invitedEmails.findFirst({
        where: eq(invitedEmails.email, email),
      });

      if (invite) {
        await db
          .update(users)
          .set({ familyId: invite.familyId, role: "MEMBER" })
          .where(eq(users.id, user.id));
        await db.delete(invitedEmails).where(eq(invitedEmails.email, email));
      } else {
        const [newFamily] = await db.insert(families).values({}).returning({ id: families.id });
        await db
          .update(users)
          .set({ familyId: newFamily.id, role: "ADMIN" })
          .where(eq(users.id, user.id));
      }

      return true;
    },
    // `user` is only populated on initial sign-in (from the adapter's
    // createUser/getUser) — re-fetch fresh from the DB rather than trust
    // `user.role`/a familyId on this object: the signIn callback above may
    // have just written role/familyId for a brand-new user, and `user` here
    // is a snapshot from before that write.
    async jwt({ token, user }) {
      if (user?.id) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, user.id),
          columns: { role: true, familyId: true },
        });
        token.id = user.id;
        token.role = dbUser?.role ?? "MEMBER";
        token.familyId = dbUser?.familyId ?? undefined;
      }
      return token;
    },
    async session({ session, token }) {
      // Require familyId too, not just id — a session without a resolved
      // family shouldn't be treated as valid (see verifySession()'s
      // `!session?.user?.id` check in lib/dal.ts, which this keeps working
      // correctly: no id set here means no session, same as before).
      if (session.user && token.id && token.familyId) {
        session.user.id = token.id;
        session.user.role = token.role ?? "MEMBER";
        session.user.familyId = token.familyId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
