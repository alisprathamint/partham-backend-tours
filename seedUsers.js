import prisma from './src/config/prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Starting seed process...');

  try {
    // 1. Create or Find Vadodara Branch
    let branch = await prisma.branch.findFirst({
      where: { name: 'Vadodara' }
    });

    if (!branch) {
      branch = await prisma.branch.create({
        data: {
          name: 'Vadodara',
          city: 'Vadodara',
          isMain: false,
          status: 'ACTIVE'
        }
      });
      console.log('Created new Vadodara branch:', branch.id);
    } else {
      console.log('Vadodara branch already exists:', branch.id);
    }

    // 2. Create Branch Manager
    const managerEmail = 'vadodarabranchmanager@gmail.com';
    const managerPassword = 'vadodara123';
    
    let manager = await prisma.user.findUnique({
      where: { email: managerEmail }
    });

    if (!manager) {
      const hashedPassword = await bcrypt.hash(managerPassword, 10);
      manager = await prisma.user.create({
        data: {
          name: 'Vadodara Manager',
          email: managerEmail,
          password: hashedPassword,
          role: 'BRANCH_MANAGER',
          branchId: branch.id
        }
      });
      console.log('Created Branch Manager:', manager.email);
    } else {
      console.log('Branch Manager already exists:', manager.email);
    }

    // Assign manager to the branch explicitly via managedBranch relation
    await prisma.branch.update({
      where: { id: branch.id },
      data: { managerId: manager.id }
    });
    console.log('Assigned manager to branch.');

  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    // Note: Do not disconnect process here as we're using a pg pool adapter
    // The node process will exit when done.
    console.log('Seed process finished.');
    process.exit(0);
  }
}

main();
