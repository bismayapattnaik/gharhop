import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import type { ReportStatus } from "@prisma/client";

// GH-A105 "Trust cases" — admin-only status transitions with rationale kept
// (the `details` field on the report is treated as append-only in spirit;
// the prototype just overwrites status, a real build would log an AuditEvent).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser("ADMIN");
    const { id } = await params;
    const body = await request.json();
    const status = body.status as ReportStatus;
    const report = await prisma.trustReport.update({ where: { id }, data: { status } });
    return NextResponse.json({ report });
  } catch (e) {
    return handleApiError(e);
  }
}
