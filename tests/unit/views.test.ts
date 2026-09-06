import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import type { D1Database } from "@cloudflare/workers-types";
import { onRequestGet } from "../../functions/api/views";

test("counter handler increments the initialized row in SQLite", async context => {
  const db = new DatabaseSync(":memory:");
  context.after(() => db.close());
  db.exec(readFileSync("schema.sql", "utf8"));
  const DB = {
    prepare(sql: string) {
      return { first: async () => db.prepare(sql).get() };
    },
  } as unknown as D1Database;
  const response = await onRequestGet({ env: { DB } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { count: 3387 });
  assert.deepEqual(await (await onRequestGet({ env: { DB } })).json(), { count: 3388 });
});

test("database failure returns the existing API error shape", async () => {
  const DB = {
    prepare() {
      throw new Error("unavailable");
    },
  } as unknown as D1Database;
  const response = await onRequestGet({ env: { DB } });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Failed to fetch count" });
});
