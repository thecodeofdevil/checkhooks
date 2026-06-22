import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { url, method, headers, body } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Invalid target URL." }, { status: 400 });
    }

    const targetUrl = new URL(url);
    const sendResponse = await fetch(targetUrl.toString(), {
      method: method || "POST",
      headers: Object.fromEntries(
        (headers || []).filter((header: any) => header.name && header.value).map((header: any) => [header.name, header.value])
      ),
      body: method === "GET" || method === "DELETE" ? undefined : body,
    });

    const resultText = await sendResponse.text();
    return NextResponse.json({ status: sendResponse.status, statusText: sendResponse.statusText, body: resultText });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Checkhook dispatch failed." }, { status: 500 });
  }
}
