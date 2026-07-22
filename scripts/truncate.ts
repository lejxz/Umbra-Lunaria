import { db } from "../lib/db";
import { sql } from "drizzle-orm";

await db.execute(sql`DROP TABLE IF EXISTS hall_of_fame_records CASCADE`);
console.log('Dropped table');
process.exit(0);
