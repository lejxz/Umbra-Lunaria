import { checkHallOfFameRecords } from "../lib/db/records-updater";

async function run() {
  console.log("Triggering Hall of Fame update...");
  const errors = await checkHallOfFameRecords();
  if (errors.length > 0) {
    console.error("Errors:", errors);
  } else {
    console.log("Success");
  }
  process.exit(0);
}

run();
