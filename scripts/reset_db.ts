import { db } from "../lib/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Dropping and recreating public schema...");
  await db.execute(sql`DROP SCHEMA public CASCADE;`);
  await db.execute(sql`CREATE SCHEMA public;`);
  console.log("Done.");
  process.exit(0);
}

main().catch(console.error);
