import prisma from './src/config/prisma.js';

async function seedLeads() {
  console.log("Seeding today's LEAD type leads...");
  
  const today = new Date();
  
  const newLeads = [
    {
      name: 'Sunil Verma',
      email: 'sunil.verma@example.com',
      phone: '+91 9988771122',
      destination: 'Himachal',
      origin: 'Chandigarh',
      priceRange: '25000',
      foodPref: 'Veg',
      inclusions: ['Flight', 'Hotel'],
      theme: ['Mountains', 'Adventure'],
      source: 'INSTAGRAM',
      type: 'LEAD',
      status: 'NEW',
      createdAt: today,
      numDays: 5,
      pax: 2,
    },
    {
      name: 'Sneha Patil',
      email: 'sneha.p@example.com',
      phone: '+91 8877665544',
      destination: 'Maldives',
      origin: 'Pune',
      priceRange: '150000',
      foodPref: 'Any',
      inclusions: ['Hotel', 'Activities'],
      theme: ['Honeymoon', 'Beach'],
      source: 'WEBSITE',
      type: 'LEAD',
      status: 'NEW',
      createdAt: today,
      numDays: 4,
      pax: 2,
    }
  ];

  for (const lead of newLeads) {
    const created = await prisma.lead.create({
      data: lead
    });
    console.log(`Created LEAD for ${created.name} (ID: ${created.id})`);
  }
  
  console.log('Seeding completed!');
  await prisma.$disconnect();
}

seedLeads().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
