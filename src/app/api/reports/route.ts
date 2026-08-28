import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";

// GH-408 "Report listing" — receipt + case id, routed to the trust queue
// (rendered in /admin). Reporting works even for a not-fully-signed-in
// visitor per the PRD ("Authenticated or protected public").
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const { category, targetType, targetId, details } = body;
    if (!category || !targetType || !targetId) {
      return NextResponse.json({ error: "Missing report fields." }, { status: 400 });
    }
    const report = await prisma.trustReport.create({
      data: { category, targetType, targetId, details, reporterId: user?.id },
    });
    return NextResponse.json({ report });
  } catch (e) {
    return handleApiError(e);
  }
}
