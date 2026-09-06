import type { D1Database } from "@cloudflare/workers-types";

export async function onRequestGet(context: { env: { DB: D1Database } }) {
  const { env } = context;

  try {
    const stmt = env.DB.prepare(
      "UPDATE views SET count = count + 1, updated_at = datetime('now') WHERE id = 1 RETURNING count"
    );
    const result = await stmt.first<{ count: number }>();

    return new Response(JSON.stringify({ count: result?.count ?? 0 }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to fetch count" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
