// Demo data so the prototype is explorable immediately after `npx prisma db push`.
// Run with: node prisma/seed.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const HOUR = 60 * 60 * 1000;

// Mirrors src/lib/photos.ts — duplicated here since this is a plain Node
// script (no TS path aliases available outside the Next app).
const DEMO_PHOTOS = {
  FLAT: ["/photos/flat-1.jpg", "/photos/flat-2.jpg", "/photos/flat-3.jpg", "/photos/flat-4.jpg"],
  ROOM: ["/photos/room-1.jpg", "/photos/room-2.jpg", "/photos/room-3.jpg", "/photos/room-4.jpg"],
  PG_BED: ["/photos/pgbed-1.jpg", "/photos/pgbed-2.jpg", "/photos/pgbed-3.jpg", "/photos/pgbed-4.jpg", "/photos/pgbed-5.jpg"],
};
function demoMedia(type) {
  return { photos: JSON.stringify(DEMO_PHOTOS[type]) };
}

function futureSlot(daysFromNow, hour) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return { startTime: d, endTime: new Date(d.getTime() + HOUR) };
}

async function main() {
  await prisma.notification.deleteMany();
  await prisma.trustReport.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.slotHold.deleteMany();
  await prisma.availabilitySlot.deleteMany();
  await prisma.interest.deleteMany();
  await prisma.roomPhoto.deleteMany();
  await prisma.room.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.property.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.create({ data: { phone: "0000000000", name: "GharHop Ops", role: "ADMIN" } });

  const priya = await prisma.user.create({ data: { phone: "9800000001", name: "Priya (PG operator)", role: "OWNER" } });
  const rao = await prisma.user.create({ data: { phone: "9800000002", name: "Mr. Rao", role: "OWNER" } });

  const cyberCityPg = await prisma.property.create({
    data: {
      ownerId: priya.id,
      title: "Priya's PG — DLF Cyber City Block A",
      area: "DLF Cyber City",
      address: "Tower 4, near Two Horizon Center",
      lat: 28.495,
      lng: 77.089,
      items: {
        create: [
          {
            type: "PG_BED",
            configuration: "Single bed, attached bath",
            rentAmount: 14000,
            depositAmount: 14000,
            furnishing: "Fully furnished",
            occupancyPolicy: "Women only, no visitors after 9pm",
            availableFrom: new Date(),
            status: "ACTIVE",
            bookingMode: "INSTANT",
            lastConfirmedAt: new Date(),
            ...demoMedia("PG_BED"),
          },
          {
            type: "PG_BED",
            configuration: "Shared bed (2 sharing)",
            rentAmount: 9500,
            depositAmount: 9500,
            furnishing: "Fully furnished",
            occupancyPolicy: "Women only",
            availableFrom: new Date(),
            status: "ACTIVE",
            bookingMode: "INSTANT",
            lastConfirmedAt: new Date(Date.now() - 90 * HOUR), // stale on purpose
            freshnessTtlHours: 72,
            ...demoMedia("PG_BED"),
          },
        ],
      },
    },
    include: { items: true },
  });

  const golfCourseFlat = await prisma.property.create({
    data: {
      ownerId: rao.id,
      title: "Mr. Rao's 2BHK — Golf Course Road",
      area: "Golf Course Road",
      address: "Near Nathupur village",
      lat: 28.438,
      lng: 77.1025,
      items: {
        create: [
          {
            type: "FLAT",
            configuration: "2BHK",
            rentAmount: 32000,
            depositAmount: 96000,
            furnishing: "Semi-furnished",
            availableFrom: new Date(),
            status: "ACTIVE",
            bookingMode: "APPROVAL",
            lastConfirmedAt: new Date(),
            ...demoMedia("FLAT"),
          },
        ],
      },
    },
    include: { items: true },
  });

  const sohnaRoadRoom = await prisma.property.create({
    data: {
      ownerId: rao.id,
      title: "Independent room — Sohna Road",
      area: "Sohna Road",
      address: "Near Vatika business park",
      lat: 28.4088,
      lng: 77.0367,
      items: {
        create: [
          {
            type: "ROOM",
            configuration: "Private room in 3BHK",
            rentAmount: 15500,
            depositAmount: 15500,
            furnishing: "Furnished",
            availableFrom: new Date(),
            status: "ACTIVE",
            bookingMode: "INSTANT",
            lastConfirmedAt: new Date(),
            ...demoMedia("ROOM"),
          },
        ],
      },
    },
    include: { items: true },
  });

  // A couple of items get an explicit Room Tour so the room-tab UI has real
  // data to show; the rest fall back to their flat cover-photo set as a
  // single unlabeled "Photos" room (see the seeker listing detail page).
  await prisma.room.create({
    data: {
      inventoryItemId: golfCourseFlat.items[0].id,
      name: "Living Room",
      displayOrder: 0,
      photos: { create: [{ url: "/photos/flat-1.jpg", displayOrder: 0 }, { url: "/photos/flat-2.jpg", displayOrder: 1 }] },
    },
  });
  await prisma.room.create({
    data: {
      inventoryItemId: golfCourseFlat.items[0].id,
      name: "Bedroom",
      displayOrder: 1,
      photos: { create: [{ url: "/photos/flat-3.jpg", displayOrder: 0 }, { url: "/photos/flat-4.jpg", displayOrder: 1 }] },
    },
  });
  await prisma.room.create({
    data: {
      inventoryItemId: cyberCityPg.items[0].id,
      name: "Room",
      displayOrder: 0,
      photos: { create: [{ url: "/photos/pgbed-1.jpg", displayOrder: 0 }, { url: "/photos/pgbed-2.jpg", displayOrder: 1 }] },
    },
  });

  const bookableItems = [cyberCityPg.items[0], golfCourseFlat.items[0], sohnaRoadRoom.items[0]];
  for (const item of bookableItems) {
    await prisma.availabilitySlot.createMany({
      data: [1, 2, 4].map((days) => ({
        inventoryItemId: item.id,
        ...futureSlot(days, 11 + days),
      })),
    });
  }

  console.log("Seed complete:");
  console.log("- Admin login: phone 0000000000, role ADMIN");
  console.log("- Owner login: phone 9800000001 (Priya) or 9800000002 (Mr. Rao), role OWNER");
  console.log("- Seeker: sign in with any new phone number, role SEEKER");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
