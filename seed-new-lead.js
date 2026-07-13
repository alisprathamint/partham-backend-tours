import prisma from './src/config/prisma.js';

async function main() {
  try {
    const newLead = await prisma.lead.create({
      data: {
        name: 'Rahul Sharma',
        email: 'rahul.sharma@example.com',
        phone: '+91 9876543210',
        destination: 'Maldives',
        source: 'WEBSITE',
        type: 'LEAD',
        status: 'NEW',
        travelDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        pax: 2,
        numDays: 5,
        leadCategory: 'Package B2C',
        notes: {
          create: [
            {
              content: 'Customer is looking for a romantic getaway to Maldives. Preferred water villa.',
              createdBy: 1 // Admin user ID (fallback)
            }
          ]
        }
      },
      include: {
        notes: true
      }
    });
    
    const newQuery = await prisma.lead.create({
      data: {
        name: 'Anjali Verma',
        email: 'anjali.v@example.com',
        phone: '+91 9123456789',
        destination: 'Bali',
        source: 'INSTAGRAM',
        type: 'QUERY',
        status: 'NEW',
        travelDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        pax: 4,
        numDays: 7,
        leadCategory: 'Custom B2C',
        notes: {
          create: [
            {
              content: 'Asked about Bali group tour pricing via DM.',
              createdBy: 1
            }
          ]
        }
      }
    });

    console.log('Successfully seeded lead:', newLead.name);
    console.log('Successfully seeded query:', newQuery.name);
  } catch (error) {
    console.error('Error seeding leads:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
