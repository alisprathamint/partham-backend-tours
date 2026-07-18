import prisma from './src/config/prisma.js';

function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seedHistoricalLeads() {
  console.log("Seeding historical leads (weekly, monthly, last 6 months, yearly)...");
  
  const today = new Date();
  
  // Date boundaries
  const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000);
  const oneYearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);

  const locations = ['Kerala', 'Goa', 'Dubai', 'Bali', 'Himachal', 'Maldives', 'Thailand', 'Rajasthan', 'Andaman', 'Europe', 'Sikkim', 'Sri Lanka', 'Kashmir', 'Vietnam', 'Singapore'];
  const origins = ['Delhi', 'Mumbai', 'Bangalore', 'Ahmedabad', 'Chandigarh', 'Chennai', 'Pune', 'Kolkata', 'Hyderabad', 'Guwahati', 'Cochin'];
  const statuses = ['NEW', 'IN_PROGRESS', 'CONVERTED', 'LOST'];
  
  const generateLeadsForPeriod = (startDate, endDate, count) => {
    const generated = [];
    for (let i = 0; i < count; i++) {
      generated.push({
        name: `User_${Math.floor(Math.random() * 10000)}`,
        email: `user${Math.floor(Math.random() * 10000)}@example.com`,
        phone: `+91 9${Math.floor(100000000 + Math.random() * 900000000)}`,
        destination: locations[Math.floor(Math.random() * locations.length)],
        origin: origins[Math.floor(Math.random() * origins.length)],
        priceRange: `${Math.floor(20000 + Math.random() * 150000)}`,
        foodPref: Math.random() > 0.5 ? 'Veg' : 'Any',
        inclusions: ['Flight', 'Hotel'],
        theme: ['Family', 'Holiday'],
        source: ['WEBSITE', 'FACEBOOK', 'INSTAGRAM', 'GOOGLE'][Math.floor(Math.random() * 4)],
        type: 'LEAD',
        status: statuses[Math.floor(Math.random() * statuses.length)],
        createdAt: getRandomDate(startDate, endDate),
        numDays: Math.floor(3 + Math.random() * 10),
        pax: Math.floor(1 + Math.random() * 5),
      });
    }
    return generated;
  };

  // Seed 15 for this week (between oneWeekAgo and today)
  // Seed 20 for this month (between oneMonthAgo and oneWeekAgo)
  // Seed 30 for last 6 months (between sixMonthsAgo and oneMonthAgo)
  // Seed 30 for last 1 year (between oneYearAgo and sixMonthsAgo)
  const historicalLeads = [
    ...generateLeadsForPeriod(oneWeekAgo, today, 15),
    ...generateLeadsForPeriod(oneMonthAgo, oneWeekAgo, 20),
    ...generateLeadsForPeriod(sixMonthsAgo, oneMonthAgo, 30),
    ...generateLeadsForPeriod(oneYearAgo, sixMonthsAgo, 30)
  ];

  let successCount = 0;
  for (const lead of historicalLeads) {
    try {
      await prisma.lead.create({ data: lead });
      successCount++;
    } catch (err) {
      console.error(`Failed to create lead: ${err.message}`);
    }
  }
  
  console.log(`Successfully seeded ${successCount} historical leads!`);
  await prisma.$disconnect();
}

seedHistoricalLeads().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
