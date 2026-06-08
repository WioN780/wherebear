const { PrismaClient } = require("../src/generated/prisma");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const locations = require("./location_seed.json");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Cleaning up existing games and rounds...");
  // Delete games first (this will cascade delete rounds)
  await prisma.game.deleteMany();

  console.log("Cleaning up existing locations...");
  await prisma.location.deleteMany();

  console.log(`Seeding ${locations.length} locations...`);
  const result = await prisma.location.createMany({
    data: locations.map((l) => ({
      id: l.id,
      lat: l.lat,
      lng: l.lng,
      country: l.country,
      difficulty: l.difficulty,
    })),
    skipDuplicates: true,
  });
  console.log(`Successfully seeded ${result.count} locations.`);
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
