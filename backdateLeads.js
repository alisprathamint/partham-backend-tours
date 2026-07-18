import prisma from './src/config/prisma.js';

async function backdateLeads() {
  const wonLeads = await prisma.lead.findMany({
    where: { status: 'PAYMENT_RECEIVED' }
  });

  console.log(`Found ${wonLeads.length} won leads.`);
  
  let month = 0; // Start at Jan (0)
  for (const lead of wonLeads) {
    // Distribute them across Jan to Jun (months 0 to 5)
    // plus some in July (6)
    const backdatedDate = new Date(2026, month % 7, 15); // e.g. Jan 15, Feb 15...
    
    await prisma.lead.update({
      where: { id: lead.id },
      data: { 
        updatedAt: backdatedDate,
        createdAt: backdatedDate
      }
    });
    
    console.log(`Updated Lead ${lead.id} to be won on ${backdatedDate.toISOString()}`);
    month++;
  }
}

backdateLeads().catch(console.error).finally(() => process.exit(0));
