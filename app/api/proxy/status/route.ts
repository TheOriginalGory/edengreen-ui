import { NextRequest } from "next/server";

export async function GET(_req: NextRequest) {
  const backend = process.env.BACKEND_URL!;
  const r = await fetch(`${backend}/status`, { method: "GET" });
  const text = await r.text();
  return new Response(text, {
    status: r.status,
    headers: {
      "content-type": r.headers.get("content-type") ?? "application/json",
    },
  });
}
