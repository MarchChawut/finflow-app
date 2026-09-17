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
    // No custom signIn gate — nothing here needs to reject a sign-in, and a
    // custom `signIn` callback that returns/throws falsy is exactly what
    // produces Auth.js's generic "AccessDenied" (see @auth/core's
    // handleAuthorized(): `if (!authorized) throw new AccessDenied(...)`).
    // The previous version of this callback queried `users` by `user.id`
    // to decide family membership — but for a brand-new OAuth user,
    // @auth/core calls this BEFORE adapter.createUser runs (verified
    // directly against the installed @auth/core@0.41.3 source), so
    // `user.id` was a transient crypto.randomUUID() never written to the
    // DB, and that query always missed, incorrectly denying every new
    // user. Family resolution now happens in `jwt` below instead, which
    // Auth.js calls AFTER the adapter has actually persisted the row.
    //
    // `user` is only populated on initial sign-in, and by this point Auth.js
    // has already called the adapter's createUser — `user.id` here IS the
    // real persisted row, unlike in `signIn` above. This is the correct,
    // safe place to resolve which *family* a new user lands in:
    //   - an email with a pending invite (lib/actions/invites.ts) joins that
    //     inviter's family as a MEMBER, and the invite is consumed
    //   - anyone else gets a brand-new family and becomes its ADMIN (host)
    // A *returning* user already has a familyId, so this block is a no-op
    // for them (also re-fetch fresh from DB rather than trust a stale
    // `user.role`, since `user` here is a snapshot from before any write).
    async jwt({ token, user }) {
      if (user?.id) {
        let dbUser = await db.query.users.findFirst({
          where: eq(users.id, user.id),
          columns: { role: true, familyId: true },
        });

        if (!dbUser) {
          // Should be unreachable (adapter.createUser already ran by this
          // point) — logged rather than silently leaving familyId unset,
          // which would otherwise fail closed in `session` below with no
          // trace of why.
          console.error(`[auth] jwt: no users row found for id ${user.id} right after sign-in`);
        }

        if (dbUser && !dbUser.familyId && user.email) {
          const email = user.email.toLowerCase();
          const invite = await db.query.invitedEmails.findFirst({
            where: eq(invitedEmails.email, email),
          });

          if (invite) {
            await db
              .update(users)
              .set({ familyId: invite.familyId, role: "MEMBER" })
              .where(eq(users.id, user.id));
            await db.delete(invitedEmails).where(eq(invitedEmails.email, email));
            dbUser = { role: "MEMBER", familyId: invite.familyId };
          } else {
            const [newFamily] = await db.insert(families).values({}).returning({ id: families.id });
            await db
              .update(users)
              .set({ familyId: newFamily.id, role: "ADMIN" })
              .where(eq(users.id, user.id));
            dbUser = { role: "ADMIN", familyId: newFamily.id };
          }
        }

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
