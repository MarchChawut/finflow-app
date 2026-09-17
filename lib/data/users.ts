import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifySession } from "@/lib/dal";

export const getFamilyMembers = cache(async () => {
  const user = await verifySession();
  const rows = await db.query.users.findMany({
    where: eq(users.familyId, user.familyId),
    columns: { id: true, email: true, name: true, role: true, lineUserId: true },
    orderBy: (u, { asc }) => [asc(u.createdAt)],
  });
  // Never ship another member's raw LINE user id to the client — the UI
  // only ever needs to know whether it's bound, and the raw id is exactly
  // what an attacker would need to squat someone else's LINE identity (see
  // bindLineAccount's ID-token verification).
  return rows.map(({ lineUserId, ...rest }) => ({
    ...rest,
    lineBound: lineUserId !== null,
  }));
});
