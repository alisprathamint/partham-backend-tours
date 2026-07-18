import prisma from './src/config/prisma.js';

async function assignBranchesToLeads() {
  console.log("Fetching existing branches...");
  
  const branches = await prisma.branch.findMany();
  
  if (branches.length === 0) {
    console.log("No branches found in the database. Please create branches first.");
    await prisma.$disconnect();
    return;
  }
  
  console.log(`Found ${branches.length} branches. Assigning them to leads...`);
  
  const leads = await prisma.lead.findMany({
    where: {
      type: 'LEAD'
    }
  });
  
  let successCount = 0;
  
  for (const lead of leads) {
    // Randomly select a branch
    const randomBranch = branches[Math.floor(Math.random() * branches.length)];
    
    try {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { branchId: randomBranch.id }
      });
      successCount++;
    } catch (err) {
      console.error(`Failed to assign branch to lead ${lead.id}:`, err.message);
    }
  }
  
  console.log(`Successfully assigned branches to ${successCount} leads!`);
  await prisma.$disconnect();
}

assignBranchesToLeads().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
