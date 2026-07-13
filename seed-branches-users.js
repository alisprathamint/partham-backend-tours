import prisma from './src/config/prisma.js';
import bcrypt from 'bcryptjs';

async function seed() {
  const branches = ['Vadodara', 'Ahmedabad', 'Rajkot', 'Mumbai', 'Anand', 'Delhi'];
  
  for (const branchName of branches) {
    console.log(`Seeding branch: ${branchName}`);
    
    // Create Branch Manager user
    const bmPassword = await bcrypt.hash('password123', 10);
    const bmEmail = `bm_${branchName.toLowerCase()}@prathamtours.com`;
    let bm = await prisma.user.findUnique({ where: { email: bmEmail } });
    if (!bm) {
      bm = await prisma.user.create({
        data: {
          name: `${branchName} Manager`,
          email: bmEmail,
          password: bmPassword,
          role: 'BRANCH_MANAGER'
        }
      });
    }
    
    // Create branch
    let branch = await prisma.branch.findUnique({ where: { name: branchName } });
    if (!branch) {
      branch = await prisma.branch.create({
        data: {
          name: branchName,
          city: branchName,
          managerId: bm.id
        }
      });
    } else {
      branch = await prisma.branch.update({
        where: { id: branch.id },
        data: { managerId: bm.id }
      });
    }

    // Update BM branch ID
    await prisma.user.update({
      where: { id: bm.id },
      data: { branchId: branch.id }
    });
    
    // Create 2 Sales Executives
    for (let i = 1; i <= 2; i++) {
      const seEmail = `se${i}_${branchName.toLowerCase()}@prathamtours.com`;
      let se = await prisma.user.findUnique({ where: { email: seEmail } });
      if (!se) {
        await prisma.user.create({
          data: {
            name: `${branchName} Executive ${i}`,
            email: seEmail,
            password: bmPassword,
            role: 'SALES_EXECUTIVE',
            branchId: branch.id
          }
        });
      }
    }
  }
  console.log('Seeding complete.');
}

seed().catch(e => console.error(e)).finally(() => prisma.$disconnect());
