import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { checkIn } from "@/lib/scheduling";

// GH-607 "Check-in" — explicit tap, not continuous location tracking.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const seeker = await requireUser("SEEKER");
    const { id } = await params;
    const visit = await checkIn(id, seeker.id);
    return NextResponse.json({ visit });
  } catch (e) {
    return handleApiError(e);
  }
}
