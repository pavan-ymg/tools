import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

// neon-http: stateless per-request HTTP driver — no connection pool to
// manage, which is the right shape for Vercel serverless functions
// (see docs/tools/PLAN.md §4.2).
const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
