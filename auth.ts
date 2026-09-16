import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens, invitedEmails } from "@/lib/db/schema";

// Family circle allowlist — only these emails may sign in at all. Anyone in
// the list still starts as role MEMBER (schema default); promotion to ADMIN
// is a manual DB update for now (no admin UI exists yet).
//
// Two sources, both checked on sign-in:
// - ADMIN_ALLOWED_EMAILS (env): bootstrap list, so the first admin can never
//   lock themselves out even if the DB is empty/unreachable.
// - invitedEmails (DB): emails added from the Settings UI (see
//   lib/actions/invites.ts), so inviting someone doesn't require an env edit
//   + server restart.
const envAllowedEmails = new Set(
  (process.env.ADMIN_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

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
    async signIn({ user }) {
      if (!user.email) return false;
      const email = user.email.toLowerCase();
      if (envAllowedEmails.has(email)) return true;
      const invited = await db.query.invitedEmails.findFirst({
        where: eq(invitedEmails.email, email),
      });
      return Boolean(invited);
    },
    // `user` is only populated on initial sign-in (from the adapter's
    // createUser/getUser); persist what later requests need onto the token.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      // token.id/token.role are optional on the JWT type (only set once the
      // jwt() callback above has run at least once); narrow before writing
      // them into session.user's non-optional fields.
      if (session.user && token.id) {
        session.user.id = token.id;
        session.user.role = token.role ?? "MEMBER";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
