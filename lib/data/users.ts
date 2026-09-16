import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/dal";

export const getFamilyMembers = cache(async () => {
  await verifySession();
  const rows = await db.query.users.findMany({
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
