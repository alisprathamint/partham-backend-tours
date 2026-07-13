import prisma from './src/config/prisma.js';

async function main() {
  const users = await prisma.user.findMany();
  const userIds = users.map(u => u.id);

  const categories = ['B2B', 'B2C', 'Corporate'];
  const stages = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'WON', 'LOST', 'NOT_INTERESTED'];
  const sources = ['FACEBOOK_AD', 'GOOGLE_AD', 'WEBSITE', 'REFERRAL', 'OTHER'];
  const destinations = ['Dubai', 'Maldives', 'Sikkim', 'Bali', 'Goa', 'Europe', 'Thailand'];

  const names = ['Amit', 'Sunil', 'Priya', 'Kavita', 'Ramesh', 'Suresh', 'Anita', 'Rohan', 'Neha', 'Vikas', 'Raj', 'Sanjay', 'Arun', 'Sneha', 'Pooja', 'Rahul', 'Kiran', 'Swati', 'Manish', 'Deepak'];
  const lastNames = ['Patel', 'Sharma', 'Singh', 'Gupta', 'Verma', 'Kumar', 'Shah', 'Mehta', 'Jain', 'Das', 'Joshi', 'Chauhan', 'Yadav', 'Mishra', 'Reddy', 'Nair', 'Menon', 'Iyer', 'Bose', 'Rao'];

  console.log('Seeding leads for all filters...');

  // Generate 50 leads to cover combinations
  for (let i = 0; i < 50; i++) {
    // Distribute categories, stages, sources, destinations evenly but slightly mixed
    const category = categories[i % categories.length];
    const stage = stages[i % stages.length];
    const source = sources[(i * 2) % sources.length];
    const destination = destinations[(i * 3) % destinations.length];
    
    // Assign to a user if not NEW (or randomly)
    let assignedToId = null;
    if (stage !== 'NEW' && userIds.length > 0) {
      assignedToId = userIds[i % userIds.length];
    }

    const name = names[i % names.length] + ' ' + lastNames[(i + 7) % lastNames.length];
    const email = name.toLowerCase().replace(' ', '.') + i + '@example.com';
    const phone = '+91 9' + Math.floor(100000000 + Math.random() * 900000000);
    const travelDate = new Date(Date.now() + (Math.floor(Math.random() * 60) - 10) * 24 * 60 * 60 * 1000); // from -10 days to +50 days

    await prisma.lead.create({
      data: {
        name,
        email,
        phone,
        destination,
        source,
        type: 'LEAD',
        status: stage,
        travelDate,
        pax: Math.floor(Math.random() * 8) + 1,
        numDays: Math.floor(Math.random() * 10) + 3,
        leadCategory: category,
        assignedToId: assignedToId
      }
    });
  }

  console.log('Successfully seeded 50 leads covering all filters.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
