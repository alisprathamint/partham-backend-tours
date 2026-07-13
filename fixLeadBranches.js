import prisma from './src/config/prisma.js';

async function main() {
  const leads = await prisma.lead.findMany({
    where: { assignedToId: { not: null }, branchId: null },
    include: { assignedTo: true }
  });

  for (const lead of leads) {
    if (lead.assignedTo && lead.assignedTo.branchId) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { branchId: lead.assignedTo.branchId }
      });
      console.log(`Updated lead ${lead.id} with branch ${lead.assignedTo.branchId}`);
    }
  }
  process.exit(0);
}
main();
