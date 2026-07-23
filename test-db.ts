import { getDashboardWarSummary } from "./lib/db/queries";

async function main() {
  console.log("Fetching war summary...");
  try {
    const summary = await getDashboardWarSummary();
    console.log("Success:", summary);
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}

main();
