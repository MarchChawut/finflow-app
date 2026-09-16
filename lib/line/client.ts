import "server-only";
import { messagingApi } from "@line/bot-sdk";

// Same globalThis-cached-singleton shape as lib/db/index.ts, for the same
// reason (avoid recreating it on every dev-mode HMR reload).
const globalForLine = globalThis as unknown as {
  lineClient: messagingApi.MessagingApiClient | undefined;
  lineBlobClient: messagingApi.MessagingApiBlobClient | undefined;
};

export const messagingApiClient =
  globalForLine.lineClient ??
  new messagingApi.MessagingApiClient({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
  });

// Separate client for the "blob" endpoints (downloading message content,
// e.g. a slip photo) — LINE splits these onto their own base URL/client
// class from the regular messaging API.
export const messagingApiBlobClient =
  globalForLine.lineBlobClient ??
  new messagingApi.MessagingApiBlobClient({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
  });

if (process.env.NODE_ENV !== "production") {
  globalForLine.lineClient = messagingApiClient;
  globalForLine.lineBlobClient = messagingApiBlobClient;
}
