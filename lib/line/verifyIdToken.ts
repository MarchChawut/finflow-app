import "server-only";

// LIFF ID tokens are always issued for the LIFF app's own LINE Login
// channel, and LIFF IDs are formatted "<channelId>-<randomString>" per
// LINE's docs — so the expected channel id is derivable straight from the
// caller's family's own liffId (lib/db/schema.ts's families.liffId).
function expectedChannelId(liffId: string): string {
  return liffId.split("-")[0] ?? "";
}

// Verifies a LIFF `liff.getIDToken()` value against LINE's own verify
// endpoint (never trust a client-reported LINE user id directly — see
// components/LiffBinder.tsx). Passing `client_id` pins the token to the
// calling family's own channel: LINE's endpoint only succeeds if the
// token's real `aud` claim matches what we send, so this doubles as the
// audience check — callers must pass the caller's OWN family's liffId, not
// any family's, or this check is meaningless.
export async function verifyLineIdToken(idToken: string, liffId: string): Promise<{ sub: string }> {
  const clientId = expectedChannelId(liffId);
  if (!clientId) {
    throw new Error("ยังไม่ได้ตั้งค่า LIFF ID สำหรับครอบครัวนี้");
  }

  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: clientId }),
  });

  if (!res.ok) {
    throw new Error("ยืนยันตัวตนไลน์ไม่สำเร็จ");
  }

  const data: unknown = await res.json();
  const sub = (data as { sub?: unknown })?.sub;
  if (typeof sub !== "string" || !sub) {
    throw new Error("ไม่พบข้อมูลผู้ใช้ไลน์ในผลการยืนยันตัวตน");
  }

  return { sub };
}
