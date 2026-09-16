import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";

export const getLineBindingStatus = cache(async () => {
  const sessionUser = await verifySession();
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, sessionUser.id),
    columns: { lineUserId: true },
  });
  return { lineUserId: dbUser?.lineUserId ?? null };
});
