import { config } from "../config.ts";

/** Extra headers for OpenAI-compatible AI endpoints (e.g. OpenCode Go session routing). */
export function aiExtraHeaders(): Record<string, string> {
  try {
    const raw = config.aiExtraHeaders?.trim();
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => typeof value === "string"),
    ) as Record<string, string>;
  } catch {
    return {};
  }
}
