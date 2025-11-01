export const prerender = false;

// GET /api/assets
export async function GET(context: APIContext) {
  const supabase = context.locals.supabase;
  const { data, error } = await supabase.from("assets").select("*").order("symbol", { ascending: true });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ items: data }), {
    headers: { "Content-Type": "application/json" },
  });
}

