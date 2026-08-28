// Demo data so the prototype is explorable immediately after `npx prisma db push`.
// Run with: node prisma/seed.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const HOUR = 60 * 60 * 1000;

function futureSlot(daysFromNow, hour) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return { startTime: d, endTime: new Date(d.getTime() + HOUR) };
}

async function main() {
  await prisma.trustReport.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.slotHold.deleteMany();
  await prisma.availabilitySlot.deleteMany();
  await prisma.interest.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.property.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.create({ data: { phone: "0000000000", name: "GharHop Ops", role: "ADMIN" } });

  const priya = await prisma.user.create({ data: { phone: "9800000001", name: "Priya (PG operator)", role: "OWNER" } });
  const rao = await prisma.user.create({ data: { phone: "9800000002", name: "Mr. Rao", role: "OWNER" } });

  const bellandurPg = await prisma.property.create({
    data: {
      ownerId: priya.id,
      title: "Priya's PG — Bellandur Block A",
      area: "Bellandur",
      address: "12th Cross, near Ecospace",
      lat: 12.9257,
      lng: 77.6764,
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
          },
        ],
      },
    },
    include: { items: true },
  });

  const hsrFlat = await prisma.property.create({
    data: {
      ownerId: rao.id,
      title: "Mr. Rao's 2BHK — HSR Layout",
      area: "HSR Layout",
      address: "27th Main, Sector 2",
      lat: 12.9116,
      lng: 77.6389,
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
          },
        ],
      },
    },
    include: { items: true },
  });

  const sarjapurRoom = await prisma.property.create({
    data: {
      ownerId: rao.id,
      title: "Independent room — Sarjapur Road",
      area: "Sarjapur Road",
      address: "Near Wipro corporate office",
      lat: 12.9008,
      lng: 77.6858,
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
          },
        ],
      },
    },
    include: { items: true },
  });

  const bookableItems = [bellandurPg.items[0], hsrFlat.items[0], sarjapurRoom.items[0]];
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
