import type { DefaultSession } from "next-auth";

// Augments Auth.js's built-in types with the extra fields our DrizzleAdapter
// schema (lib/db/schema.ts) and jwt/session callbacks (auth.ts) carry:
// users.role, and users.id surfaced onto the session/token.
declare module "next-auth" {
  interface User {
    role?: "ADMIN" | "MEMBER";
  }

  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "MEMBER";
    } & DefaultSession["user"];
  }
}

// `next-auth/jwt` is a bare `export * from "@auth/core/jwt"` re-export (see
// node_modules/.pnpm/next-auth@*/node_modules/next-auth/jwt.d.ts) with no
// local declarations of its own, so `declare module "next-auth/jwt"` does
// not merge into the real `JWT` interface — augment the defining module
// (`@auth/core/jwt`) instead, which is what the `jwt`/`session` callback
// parameter types actually resolve to.
//
// `@auth/core` is only a *transitive* dependency (pulled in by next-auth
// and @auth/drizzle-adapter) — pnpm's strict node_modules therefore doesn't
// expose it for direct resolution from our own files, and this `declare
// module` augmentation silently fails to attach without it. It's kept as an
// explicit devDependency (types only, never imported at runtime) solely so
// this augmentation resolves. Do not remove it.
declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: "ADMIN" | "MEMBER";
  }
}
