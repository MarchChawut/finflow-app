import "server-only";
import { ImageAnnotatorClient } from "@google-cloud/vision";

export type OcrResult = {
  rawText: string;
  /** 0–1. Vision's page-level confidence — the closest thing it gives to a
   * single "how sure are we" number for a whole image. */
  confidence: number;
};

export interface OcrProvider {
  extractText(image: Buffer): Promise<OcrResult>;
}

// Pluggable so a different provider (or a mock, for testing without GCP
// credentials — see the verification step in the Phase 4 plan) can replace
// this without touching call sites in app/api/line/webhook/route.ts.
export const googleVisionOcr: OcrProvider = {
  async extractText(image) {
    // ImageAnnotatorClient() with no args auto-loads credentials from
    // GOOGLE_APPLICATION_CREDENTIALS (standard Google Application Default
    // Credentials lookup) — no explicit keyFilename needed.
    const client = new ImageAnnotatorClient();
    const [result] = await client.documentTextDetection({
      image: { content: image },
    });

    return {
      rawText: result.fullTextAnnotation?.text ?? "",
      confidence: result.fullTextAnnotation?.pages?.[0]?.confidence ?? 0,
    };
  },
};
