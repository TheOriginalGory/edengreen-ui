import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const backend = process.env.BACKEND_URL!;
  const contentType = req.headers.get("content-type") || "";
  let body: BodyInit | undefined = undefined;
  const headers: Record<string, string> = {};

  if (contentType.includes("application/json")) {
    const json = await req.json();
    body = JSON.stringify(json);
    headers["content-type"] = "application/json";
  } else if (contentType.includes("form")) {
    const form = await req.formData();
    body = form;
  } else {
    const text = await req.text();
    body = text;
    headers["content-type"] = contentType;
  }

  const r = await fetch(`${backend}/interpret`, {
    method: "POST",
    body,
    headers,
  });

  const text = await r.text();
  return new Response(text, {
    status: r.status,
    headers: {
      "content-type": r.headers.get("content-type") ?? "application/json",
    },
  });
}
