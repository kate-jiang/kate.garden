export default {
  async fetch(request, env, _) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/api/views") {
      if (request.method === "GET") {
        try {
          const stmt = env.DB.prepare(
            'UPDATE views SET count = count + 1, updated_at = datetime("now") WHERE id = 1 RETURNING count'
          );
          const result = await stmt.first();

          if (!result) {
            return new Response(JSON.stringify({ count: 0 }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          return new Response(JSON.stringify({ count: result.count }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: "Failed to fetch count" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    return new Response("Not found", { status: 404 });
  },
};
