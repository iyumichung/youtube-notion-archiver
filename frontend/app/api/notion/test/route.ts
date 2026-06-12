import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { token, database_id } = await req.json();
  const res = await fetch(`https://api.notion.com/v1/databases/${database_id}`, {
    headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28" },
  });
  if (!res.ok) {
    const err = await res.json();
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  return NextResponse.json({ success: true, message: "Notion 연결 성공!" });
}
