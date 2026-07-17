import prisma from './src/config/prisma.js';

async function seedLeads() {
  console.log("Seeding today's leads...");
  
  const today = new Date();
  
  const newLeads = [
    {
      name: 'Amit Sharma',
      email: 'amit.sharma@example.com',
      phone: '+91 9876543210',
      destination: 'Kerala',
      origin: 'Delhi',
      priceRange: '50000',
      foodPref: 'Veg',
      inclusions: ['Flight', 'Hotel', 'Sightseeing'],
      theme: ['Family', 'Nature'],
      source: 'WEBSITE',
      type: 'QUERY',
      status: 'NEW',
      createdAt: today,
      numDays: 6,
      pax: 4,
    },
    {
      name: 'Priya Desai',
      email: 'priya.desai@example.com',
      phone: '+91 9123456789',
      destination: 'Goa',
      origin: 'Mumbai',
      priceRange: '35000',
      foodPref: 'Any',
      inclusions: ['Hotel', 'Activities'],
      theme: ['Beach', 'Adventure'],
      source: 'FACEBOOK',
      type: 'QUERY',
      status: 'NEW',
      createdAt: today,
      numDays: 4,
      pax: 2,
    },
    {
      name: 'Rohan Gupta',
      email: 'rohan.g@example.com',
      phone: '+91 9988776655',
      destination: 'Dubai',
      origin: 'Bangalore',
      priceRange: '120000',
      foodPref: 'Non-Veg',
      inclusions: ['Flight', 'Hotel', 'Visa', 'Activities'],
      theme: ['Shopping', 'Adventure'],
      source: 'GOOGLE',
      type: 'QUERY',
      status: 'NEW',
      createdAt: today,
      numDays: 5,
      pax: 2,
    }
  ];

  for (const lead of newLeads) {
    const created = await prisma.lead.create({
      data: lead
    });
    console.log(`Created lead for ${created.name} (ID: ${created.id})`);
  }
  
  console.log('Seeding completed!');
  await prisma.$disconnect();
}

seedLeads().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
