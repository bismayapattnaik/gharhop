import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { defaultPhotosFor, defaultPanoramaFor } from "@/lib/photos";
import type { InventoryType } from "@prisma/client";

// Adds another inventory item (room/bed/flat) under an owner's existing
// property — the PG bed/room hierarchy from PRD section 8.B.
export async function POST(request: Request) {
  try {
    const owner = await requireUser("OWNER");
    const body = await request.json();
    const { propertyId, type, configuration, rentAmount, depositAmount, furnishing, occupancyPolicy, availableFrom } = body;

    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundError("Property not found");
    if (property.ownerId !== owner.id) throw new ForbiddenError("Not your property");

    const item = await prisma.inventoryItem.create({
      data: {
        propertyId,
        type,
        configuration,
        rentAmount: Number(rentAmount),
        depositAmount: Number(depositAmount),
        furnishing: furnishing || "Unfurnished",
        occupancyPolicy: occupancyPolicy || null,
        availableFrom: availableFrom ? new Date(availableFrom) : new Date(),
        status: "DRAFT",
        photos: defaultPhotosFor(type as InventoryType),
        panoramaUrl: defaultPanoramaFor(type as InventoryType),
      },
    });
    return NextResponse.json({ item });
  } catch (e) {
    return handleApiError(e);
  }
}
