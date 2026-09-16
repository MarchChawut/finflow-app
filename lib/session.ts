import "server-only";
import { cache } from "react";
import { auth } from "@/auth";

// React's cache() dedupes this across the layout + page's calls within a
// single request, so the JWT cookie is only decoded once per request even
// though the layout (for the redirect) and the page (for the Header) both
// need it.
export const getSession = cache(async () => auth());
