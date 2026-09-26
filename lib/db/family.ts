import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

// A solo family (just its host, nobody invited yet) has no one else who
// could ever see the difference between FAMILY and PERSONAL — so there's
// nothing useful to ask, and every LINE-recorded transaction is PERSONAL by
// construction (see app/api/line/webhook/[webhookSlug]/route.ts). Also used
// by lib/data/payPeriod.ts to decide whether a FAMILY-visibility row with no
// createdById (a historical/unbound LINE capture) can be unambiguously
// attributed to the family's one member.
export async function isSoloFamily(familyId: string): Promise<boolean> {
  const members = await db.query.users.findMany({
    where: eq(users.familyId, familyId),
    columns: { id: true },
    limit: 2,
  });
  return members.length <= 1;
}
