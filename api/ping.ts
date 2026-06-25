export default function handler(req: Request) {
  return new Response(JSON.stringify({ status: "ok", time: new Date().toISOString() }), {
    headers: { "Content-Type": "application/json" },
  });
}