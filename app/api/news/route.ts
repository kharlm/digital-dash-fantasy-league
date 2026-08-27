import { NextResponse } from "next/server";

import { getNewsBlurbs } from "@/lib/news/generate";

export async function GET() {
  const blurbs = await getNewsBlurbs();
  return NextResponse.json({ blurbs });
}
