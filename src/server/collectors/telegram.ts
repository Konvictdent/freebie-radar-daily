import { cleanText, parseDate } from "../enrich/normalize.ts";
import { flaresolverrGet, hasFlare } from "../flaresolverr.ts";
import type { Collector, RawItem } from "./types.ts";

function stripTags(html: string): string {
  return cleanText(html.replace(/<br\s*\/?>/gi, "\n"), 400);
}

/**
 * 网盘资源频道常见两种脏标题：
 *   1. 「《漂流瓶》 分类: #教程 #资料 #图书 1. xxx 2. xxx」—— 频道栏目名 + 标签 + 编号列表
 *   2. 「名称：欲望的陷阱 [内封简繁英字幕]」—— 字段名当标题
 * 只清理这两种前缀，普通频道（tg-cn-deals / tg-freegames）的标题不受影响。
 */
function cleanTgTitle(raw: string): string {
  const cleaned = raw
    .replace(/^《[^》]{1,24}》\s*分类[:：]\s*(?:#[^\s#]+\s*)+/u, "")
    .replace(/^名称[:：]\s*/u, "");
  // 「名称：白蛇传 描述：2006年版...」两个字段挤在同一行时，标题只留名称部分；
  // 拆分后的条目还带着「1. 」「2、」编号，一并去掉
  return cleaned.split(/\s*描述[:：]/u)[0]!.replace(/^\d{1,2}[.、]\s*/u, "").trim();
}

/**
 * 把「1. A 2. B 3. C」这种一条消息塞多个资源的帖子拆成多条。
 * 只在源配置 splitNumbered=true 时启用：@YioveComplex 每条消息列 4-6 个资源，
 * 不拆的话标题只能显示第一个，其余全丢。
 */
function splitNumberedEntries(text: string): string[] {
  const parts = text
    .split(/(?=(?<![\d.])\d{1,2}[.、]\s*[【\[「《(（A-Za-z\u4e00-\u9fff])/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
  return parts.length > 1 ? parts : [];
}

type Message = { postId: string; text: string; datetime: string | null; imageUrl: string | null };

function extractTgImage(block: string): string | null {
  const bg = /tgme_widget_message_photo_wrap[^>]*style="[^"]*background-image:url\('([^']+)'\)/i.exec(block);
  if (bg?.[1]) return bg[1];
  const img = /<img[^>]+src="([^"]+)"/i.exec(block);
  if (img?.[1] && !/emoji|avatar/i.test(img[1])) return img[1];
  return null;
}

function parseChannelPage(html: string): Message[] {
  const out: Message[] = [];
  const blocks = html.split('class="tgme_widget_message_wrap');
  for (const block of blocks.slice(1)) {
    const idMatch = /data-post="([^"/]+)\/(\d+)"/.exec(block);
    if (!idMatch) continue;
    const textMatch = /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(block);
    const timeMatch = /<time[^>]*datetime="([^"]+)"/.exec(block);
    if (!textMatch) continue;
    out.push({
      postId: idMatch[2] ?? "",
      text: stripTags(textMatch[1] ?? ""),
      datetime: timeMatch?.[1] ?? null,
      imageUrl: extractTgImage(block),
    });
  }
  return out;
}

export const telegramCollector: Collector = {
  kind: "telegram",
  label: "Telegram 频道",
  defaults: { config: { channels: [] } },
  async collect(ctx) {
    const channels = (ctx.config.channels as string[] | undefined) ?? [];
    if (!channels.length) throw new Error("未配置 channels");
    const splitNumbered = ctx.config.splitNumbered === true;

    const items: RawItem[] = [];
    const problems: string[] = [];
    let ok = 0;

    for (const channel of channels) {
      const url = "https://t.me/s/" + channel;
      try {
        // t.me 的公开预览页直连即可；只有直连解析不到时才降级到 FlareSolverr。
        // 之前无条件走 FlareSolverr，拿回的是人机校验页，解析永远是 0 条。
        let body = "";
        const direct = await ctx.http.text(url).catch(() => null);
        if (direct && direct.status === 200) body = direct.body;
        let messages = body ? parseChannelPage(body).slice(-30) : [];
        if (!messages.length && hasFlare()) {
          const res = await flaresolverrGet(url);
          if (res.status === 200) {
            body = res.body;
            messages = parseChannelPage(body).slice(-30);
          }
        }
        if (!messages.length) throw new Error("页面解析不到消息（频道不存在或页面结构变化）");

        ctx.log(channel + " parsed " + messages.length + " messages");
        ok += 1;
        for (const m of messages) {
          if (!m.text) continue;
          const body = m.text.replace(/^《[^》]{1,24}》\s*分类[:：]\s*(?:#[^\s#]+\s*)+/u, "");
          const chunks = splitNumbered ? splitNumberedEntries(body) : [];
          if (chunks.length > 1) {
            // 一条消息含多个资源：拆成多条，externalId 加序号后缀避免主键冲突
            chunks.forEach((chunk, idx) => {
              const title = cleanTgTitle(chunk).slice(0, 180);
              if (!title) return;
              items.push({
                externalId: channel + "/" + m.postId + "-" + idx,
                // url_key 有 UNIQUE 约束，同一消息拆出的多条必须带不同 query，否则只有第一条能入库
                url: url + "/" + m.postId + "?part=" + idx,
                title,
                summary: chunk.slice(0, 400),
                content: chunk,
                author: channel,
                publishedAt: parseDate(m.datetime),
                tags: ["telegram", channel],
                imageUrl: m.imageUrl,
                raw: { channel, postId: m.postId, part: idx },
              });
            });
            continue;
          }
          const firstLine = m.text.split("\n")[0] ?? m.text;
          items.push({
            externalId: channel + "/" + m.postId,
            url: url + "/" + m.postId,
            title: cleanTgTitle(firstLine).slice(0, 180),
            summary: m.text.slice(0, 400),
            content: m.text,
            author: channel,
            publishedAt: parseDate(m.datetime),
            tags: ["telegram", channel],
            imageUrl: m.imageUrl,
            raw: { channel, postId: m.postId },
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        problems.push(channel + ": " + message);
        ctx.log(channel + " FAILED " + message);
      }
    }

    if (!ok && problems.length) throw new Error("全部频道失败: " + problems.join("; "));

    return {
      items: items.slice(0, ctx.maxItems),
      cursor: null,
      degraded: problems.length ? problems.join("; ") : null,
    };
  },
};
