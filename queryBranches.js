import prisma from './src/config/prisma.js';

async function main() {
  const branches = await prisma.branch.findMany();
  console.log(JSON.stringify(branches, null, 2));
  process.exit(0);
}
main();
