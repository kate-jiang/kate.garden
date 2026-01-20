export async function onRequestGet(context) {
  const { env } = context;

  try {
    const stmt = env.DB.prepare(
      'UPDATE views SET count = count + 1, updated_at = datetime("now") WHERE id = 1 RETURNING count'
    );
    const result = await stmt.first();

    return new Response(JSON.stringify({ count: result?.count ?? 0 }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch count" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
