const fs = require("fs");
const path = require("path");
require("dotenv").config();
const { PrismaClient } = require("../src/generated/prisma");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🚀 Starting location integration...");

  const files = [
    { name: "locations-easy.json", difficulty: "easy" },
    { name: "locations-medium.json", difficulty: "medium" },
    { name: "locations-hard.json", difficulty: "hard" },
  ];

  // 1. Clean up old data
  console.log("🧹 Cleaning up existing game data and locations...");
  try {
    await prisma.guess.deleteMany();
    await prisma.round.deleteMany();
    await prisma.game.deleteMany();
    await prisma.location.deleteMany();
  } catch (err) {
    console.log(
      "ℹ️  No existing tables found or they are already empty. Proceeding to insertion...",
    );
  }

  let totalInserted = 0;

  for (const file of files) {
    const filePath = path.join(__dirname, "locations", file.name);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${file.name}, skipping...`);
      continue;
    }

    console.log(`📦 Processing ${file.name}...`);
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    console.log(`🔍 Found ${data.length} locations in ${file.name}.`);

    // Prepare data for batch insert
    const locationsToInsert = data.map((loc) => {
      const tags = loc.extra?.tags || [];
      return {
        lat: loc.lat,
        lng: loc.lng,
        panoId: loc.panoId,
        heading: loc.heading,
        country: tags[0] || "Unknown",
        subdivision: tags[1] || null,
        surface: tags[2] || null,
        elevation: tags[3] ? parseFloat(tags[3]) : null,
        difficulty: file.difficulty,
      };
    });

    // Prisma createMany is efficient for batch inserts
    const result = await prisma.location.createMany({
      data: locationsToInsert,
      skipDuplicates: true,
    });

    console.log(
      `✅ Inserted ${result.count} locations for difficulty: ${file.difficulty}`,
    );
    totalInserted += result.count;
  }

  console.log(
    `\n🎉 Integration complete! Total locations in database: ${totalInserted}`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Integration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
