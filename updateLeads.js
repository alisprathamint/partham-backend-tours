import prisma from './src/config/prisma.js';

async function run() {
  const leads = await prisma.lead.findMany({
    where: { status: { not: 'PAYMENT_RECEIVED' } },
    take: 15
  });
  let count = 0;
  for (const lead of leads) {
    if (count % 2 === 0) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'PAYMENT_RECEIVED', type: 'QUERY' }
      });
      console.log(`Updated Lead ${lead.id} to PAYMENT_RECEIVED`);
    }
    count++;
  }
}

run().catch(console.error).finally(() => process.exit(0));
