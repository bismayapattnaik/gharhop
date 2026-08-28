import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { adminConfirmVisit } from "@/lib/scheduling";

// Ops override: force-confirm a pending request when an owner has gone
// unresponsive past their SLA (the launch plan's escalation path — a human
// on the ops team stepping in, mirrored here as the admin console action).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser("ADMIN");
    const { id } = await params;
    const visit = await adminConfirmVisit(id);
    return NextResponse.json({ visit });
  } catch (e) {
    return handleApiError(e);
  }
}
