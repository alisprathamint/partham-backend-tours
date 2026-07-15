import prisma from './src/config/prisma.js';

async function main() {
  console.log('Seeding new test leads...');

  // Get a branch if available
  const branch = await prisma.branch.findFirst();
  const branchId = branch ? branch.id : null;

  const leads = [
    {
      name: 'Rohan Sharma',
      phone: '9876543210',
      email: 'rohan.s@example.com',
      destination: 'Goa',
      source: 'WEBSITE',
      leadCategory: 'B2C',
      type: 'LEAD',
      status: 'NEW',
      pax: 2,
      numDays: 5,
      travelDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      branchId: branchId
    },
    {
      name: 'Amit Patel',
      phone: '9988776655',
      email: 'amit.patel@example.com',
      destination: 'Manali',
      source: 'FACEBOOK',
      leadCategory: 'B2C',
      type: 'LEAD',
      status: 'IN_PROGRESS',
      pax: 4,
      numDays: 6,
      branchId: branchId
    },
    {
      name: 'Priya Singh',
      phone: '9123456789',
      destination: 'Kerala',
      source: 'INSTAGRAM',
      leadCategory: 'B2C',
      type: 'LEAD',
      status: 'NEW',
      pax: 2,
      numDays: 4,
    },
    {
      name: 'TechCorp Retreats (Suresh)',
      phone: '9001122334',
      email: 'suresh@techcorp.com',
      destination: 'Bali',
      source: 'MANUAL',
      leadCategory: 'B2B',
      type: 'LEAD',
      status: 'NEW',
      pax: 25,
      numDays: 7,
      isDuplicate: false,
    },
    {
      name: 'Kiran Desai',
      phone: '9876543210', // Duplicate phone as Rohan
      destination: 'Dubai',
      source: 'WEBSITE',
      leadCategory: 'B2C',
      type: 'LEAD',
      status: 'NEW',
      isDuplicate: true,
      branchId: branchId
    },
    {
      name: 'Vikram Mehta',
      phone: '8899001122',
      email: 'vikram.m@example.com',
      destination: 'Andaman',
      source: 'WEBSITE',
      leadCategory: 'B2C',
      type: 'LEAD',
      status: 'CONTACTED',
      pax: 3,
      numDays: 5,
    },
    {
      name: 'Neha Gupta',
      phone: '7766554433',
      destination: 'Goa',
      source: 'FACEBOOK',
      leadCategory: 'B2C',
      type: 'LEAD',
      status: 'LOST',
    }
  ];

  for (const lead of leads) {
    await prisma.lead.create({ data: lead });
  }

  console.log(`Successfully seeded ${leads.length} leads!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
