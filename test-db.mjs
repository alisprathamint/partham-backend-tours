import prisma from "./src/config/prisma.js";

async function main() {
  try {
    await prisma.$connect();
    console.log("Connected successfully");
    const count = await prisma.user.count().catch(() => "User table error");
    console.log("User count:", count);
  } catch (error) {
    console.error("Connection error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
