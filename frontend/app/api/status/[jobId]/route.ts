import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/jobStore";

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const job = getJob(params.jobId);
  if (!job) return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json(job);
}
