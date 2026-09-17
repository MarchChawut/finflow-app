import "server-only";
import { messagingApi } from "@line/bot-sdk";
import { decrypt } from "@/lib/crypto/encryption";

export type FamilyLineCredentials = {
  lineChannelAccessTokenEncrypted: string | null;
  lineChannelSecretEncrypted: string | null;
};

export type LineClients = {
  client: messagingApi.MessagingApiClient;
  blobClient: messagingApi.MessagingApiBlobClient;
};

// Replaces the old lib/line/client.ts module-level singleton (built once
// from a single global env var) now that each family has its own encrypted
// access token. Deliberately built fresh per call, not cached on
// `globalThis` the way the old singleton was — a credential rotation in
// Settings takes effect on the very next call, no app restart needed.
export function getLineClientsForFamily(family: FamilyLineCredentials): LineClients | null {
  if (!family.lineChannelAccessTokenEncrypted) return null;

  const channelAccessToken = decrypt(family.lineChannelAccessTokenEncrypted);
  return {
    client: new messagingApi.MessagingApiClient({ channelAccessToken }),
    blobClient: new messagingApi.MessagingApiBlobClient({ channelAccessToken }),
  };
}
