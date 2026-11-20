import { config } from "./config.ts";

/**
 * PushPlus 推送（https://www.pushplus.plus）。
 * 用 txt 模板保留纯文本日报的换行与链接。
 */
export async function sendPushPlus(text: string, title: string): Promise<void> {
  if (!config.pushplusToken) {
    throw new Error("PUSH_CHANNEL=pushplus 但缺少 PUSHPLUS_TOKEN");
  }
  const content = text.length > 19_000
    ? text.slice(0, 19_000) + "\n\n…（内容过长已截断）"
    : text;
  const res = await fetch("https://www.pushplus.plus/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      token: config.pushplusToken,
      title,
      content,
      template: "txt",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as { code?: number; msg?: string };
  if (!res.ok || (body.code !== 200 && body.code !== 0)) {
    throw new Error(`PushPlus HTTP ${res.status} ${body.msg ?? ""}`.trim());
  }
}
