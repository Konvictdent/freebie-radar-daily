import assert from "node:assert/strict";
import { after, before, test } from "node:test";

// 测试要可重复：内存库 + 显式压平本机 .env 的干扰（与 routes-and-collect.test.ts 同套路）
process.env.DATABASE_PATH = ":memory:";
process.env.SITE_MODE = "selfhost";
process.env.ADMIN_TOKEN = "";
process.env.SCAN_FLOOR_SEC = "3600";

const { migrate, all, run, closeDb } = await import("../src/server/db.ts");
const { ensureSources } = await import("../src/server/collectors/index.ts");
const { listDueSourceIds } = await import("../src/server/cron.ts");

const MIN = 60_000;

/** 直接改库里的探针源，控制 interval_sec / last_run_at，绕开真实采集。 */
function setSource(id: string, intervalSec: number, minutesAgo: number | null): void {
  const lastRunAt = minutesAgo === null ? null : new Date(Date.now() - minutesAgo * MIN).toISOString();
  run("UPDATE sources SET enabled = 1, interval_sec = ?, last_run_at = ? WHERE id = ?", intervalSec, lastRunAt, id);
}

before(() => {
  migrate();
  ensureSources();
});

after(() => {
  closeDb();
});

test("SCAN_FLOOR_SEC：快源被抬到全局下限，慢源维持自身间隔", () => {
  const [fast, slow] = all<{ id: string }>(
    "SELECT id FROM sources WHERE kind = 'rss' ORDER BY id LIMIT 2",
  );
  assert.ok(fast && slow, "seed 里应至少有两个 rss 源当探针");

  // 快源 90s、30 分钟前跑过：没到 3600s 下限，不该被调度
  setSource(fast.id, 90, 30);
  let due = listDueSourceIds();
  assert.ok(!due.includes(fast.id), "90s 源在 3600s 下限下 30 分钟内不应到期");

  // 快源 61 分钟前跑过：超过下限，该被调度
  setSource(fast.id, 90, 61);
  due = listDueSourceIds();
  assert.ok(due.includes(fast.id), "快源超过 3600s 下限应到期");

  // 慢源 7200s、90 分钟前跑过：自身间隔大于下限，仍按自身间隔算，不该被调度
  setSource(slow.id, 7200, 90);
  due = listDueSourceIds();
  assert.ok(!due.includes(slow.id), "7200s 源 90 分钟前跑过不应到期");

  // 慢源 7200s、110 分钟前跑过：自身间隔未到，不该被调度（下限只抬不降，不会缩短慢源间隔）
  setSource(slow.id, 7200, 110);
  due = listDueSourceIds();
  assert.ok(!due.includes(slow.id), "7200s 源 110 分钟前跑过不应到期（下限不缩短慢源间隔）");
  setSource(slow.id, 3600, 61);
  due = listDueSourceIds();
  assert.ok(due.includes(slow.id), "3600s 源超过间隔应到期");
});

test("SCAN_FLOOR_SEC：从未跑过的源仍然立即可调度", () => {
  const [probe] = all<{ id: string }>("SELECT id FROM sources WHERE kind = 'rss' ORDER BY id LIMIT 1");
  setSource(probe.id, 90, null);
  const due = listDueSourceIds();
  assert.ok(due.includes(probe.id), "last_run_at 为 NULL 的新源不受下限阻拦");
});
