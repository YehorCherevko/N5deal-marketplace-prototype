import { spawnSync } from "node:child_process";
import pg from "pg";
import "dotenv/config";
import { requireLocalDatabase } from "./database";

const originalUrl = new URL(process.env.DATABASE_URL ?? "");
const testUrl = new URL(originalUrl);
testUrl.pathname = "/n5deal_test";
process.env.DATABASE_URL = testUrl.toString();
requireLocalDatabase("test");

const admin = new pg.Client({ connectionString: originalUrl.toString() });
try {
  await admin.connect();
  // Only the explicitly named, disposable test database is ever recreated.
  await admin.query('DROP DATABASE IF EXISTS "n5deal_test"');
  await admin.query('CREATE DATABASE "n5deal_test"');
  await admin.end();
  for (const command of ["db:migrate", "verify:db", "verify:fixtures"]) {
    const result = spawnSync("npm", ["run", command], { stdio: "inherit", env: process.env });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${command} failed with status ${result.status}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
  await admin.end();
}
