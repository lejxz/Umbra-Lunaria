import { db } from "../lib/db";
import * as schema from "../lib/db/schema";
import fs from "fs";

async function main() {
  const data: Record<string, any[]> = {};
  
  // Dump each table
  data.clans = await db.select().from(schema.clans);
  data.members = await db.select().from(schema.members);
  data.memberSnapshots = await db.select().from(schema.memberSnapshots);
  data.membershipEvents = await db.select().from(schema.membershipEvents);
  data.unitLevels = await db.select().from(schema.unitLevels);
  data.wars = await db.select().from(schema.wars);
  data.warAttacks = await db.select().from(schema.warAttacks);
  data.warParticipants = await db.select().from(schema.warParticipants);
  data.capitalDistrictSnapshots = await db.select().from(schema.capitalDistrictSnapshots);
  data.capitalRaidSeasons = await db.select().from(schema.capitalRaidSeasons);
  data.capitalContributions = await db.select().from(schema.capitalContributions);
  data.warRosters = await db.select().from(schema.warRosters);
  data.warRosterSlots = await db.select().from(schema.warRosterSlots);
  data.hallOfFameRecords = await db.select().from(schema.hallOfFameRecords);
  data.cwlSeasons = await db.select().from(schema.cwlSeasons);
  data.runtimeSettings = await db.select().from(schema.runtimeSettings);

  fs.writeFileSync("neon_data.json", JSON.stringify(data, null, 2));
  console.log("Successfully dumped all data to neon_data.json");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error dumping data:", err);
  process.exit(1);
});
