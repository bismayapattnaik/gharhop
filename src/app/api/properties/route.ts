import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helpers";
import { defaultPhotosFor, defaultPanoramaFor } from "@/lib/photos";
import type { InventoryType } from "@prisma/client";

// Creates a Property + its first InventoryItem together (GH-O201, GH-O203).
// The owner console lets an owner add more inventory items to a property later.
export async function POST(request: Request) {
  try {
    const owner = await requireUser("OWNER");
    const body = await request.json();

    const { title, area, address, lat, lng, type, configuration, rentAmount, depositAmount, furnishing, occupancyPolicy, availableFrom } = body;

    if (!title || !area || !address || lat == null || lng == null) {
      return NextResponse.json({ error: "Missing property fields." }, { status: 400 });
    }
    if (!type || !configuration || !rentAmount || !depositAmount) {
      return NextResponse.json({ error: "Missing inventory fields." }, { status: 400 });
    }

    const property = await prisma.property.create({
      data: {
        ownerId: owner.id,
        title,
        area,
        address,
        lat: Number(lat),
        lng: Number(lng),
        items: {
          create: {
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
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ property });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function GET() {
  try {
    const owner = await requireUser("OWNER");
    const properties = await prisma.property.findMany({
      where: { ownerId: owner.id },
      include: { items: { include: { slots: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ properties });
  } catch (e) {
    return handleApiError(e);
  }
}
