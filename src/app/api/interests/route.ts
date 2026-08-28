import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";

// GH-501/GH-402 — right-swipe/shortlist or pass. Kept separate from booking
// a visit: "A right swipe is interest. A GharHop match is a confirmed visit."
export async function POST(request: Request) {
  try {
    const seeker = await requireUser("SEEKER");
    const body = await request.json();
    const { inventoryItemId, action } = body;

    if (!["SHORTLIST", "PASS"].includes(action)) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const interest = await prisma.interest.upsert({
      where: { seekerId_inventoryItemId: { seekerId: seeker.id, inventoryItemId } },
      update: { action },
      create: { seekerId: seeker.id, inventoryItemId, action },
    });

    return NextResponse.json({ interest });
  } catch (e) {
    return handleApiError(e);
  }
}
