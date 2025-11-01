export const prerender = false;

export function GET() {
  const body = {
    status: "ok",
    time: new Date().toISOString(),
  };
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  });
}
