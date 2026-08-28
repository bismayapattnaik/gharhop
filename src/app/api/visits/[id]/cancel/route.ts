import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { cancelVisit } from "@/lib/scheduling";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const visit = await prisma.visit.findUnique({ where: { id }, include: { inventoryItem: { include: { property: true } } } });
    if (!visit) throw new NotFoundError("Visit not found");

    let actorRole: "seeker" | "host";
    if (visit.seekerId === user.id) actorRole = "seeker";
    else if (visit.inventoryItem.property.ownerId === user.id) actorRole = "host";
    else if (user.role === "ADMIN") actorRole = "host"; // operational override, not the seeker's fault
    else throw new ForbiddenError("Not your visit");

    const updated = await cancelVisit({ visitId: id, actorRole, reason: body.reason ?? (user.role === "ADMIN" ? "Cancelled by GharHop support" : undefined) });
    return NextResponse.json({ visit: updated });
  } catch (e) {
    return handleApiError(e);
  }
}
