import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Data Access Layer entry point (see node_modules/next/dist/docs/01-app/02-guides/authentication.md
// "Creating a Data Access Layer"). Proxy only does an optimistic cookie
// check; every Server Action / data read re-verifies the session here so
// authorization never depends on Proxy alone.
export const verifySession = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user;
});
