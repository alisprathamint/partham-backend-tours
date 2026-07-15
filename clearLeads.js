import prisma from './src/config/prisma.js';

async function main() {
  console.log('Clearing all leads/queries from database...');
  await prisma.note.deleteMany();
  await prisma.task.deleteMany();
  const deleted = await prisma.lead.deleteMany();
  console.log(`Deleted ${deleted.count} leads.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
