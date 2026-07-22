import { checkHallOfFameRecords } from "../lib/db/records-updater";

console.log("Running Hall of Fame records computation...");
const errors = await checkHallOfFameRecords();
if (errors.length === 0) {
  console.log("✅ Hall of Fame records updated successfully!");
} else {
  console.log("⚠️ Completed with errors:");
  for (const e of errors) console.error(" -", e);
}
process.exit(0);
