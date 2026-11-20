import { migrate } from "../src/server/db.ts";
import { digestExists, runDaily } from "../src/server/digest.ts";

migrate();
const now = new Date();
const key =
  now.getFullYear() +
  "-" +
  String(now.getMonth() + 1).padStart(2, "0") +
  "-" +
  String(now.getDate()).padStart(2, "0");

if (digestExists(key)) {
  console.log(`[daily] ${key} already exists, skip`);
  process.exit(0);
}

const result = await runDaily();
console.log(`[daily] ${result.date} count=${result.count} pushed=${result.pushed}`);
