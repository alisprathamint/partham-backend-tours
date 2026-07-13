import prisma from './src/config/prisma.js'
import bcrypt from 'bcryptjs'

async function main() {
  const hashedPassword = await bcrypt.hash('sales123', 10)
  
  const user = await prisma.user.upsert({
    where: { email: 'sales@prathamtours.com' },
    update: {
      password: hashedPassword,
      name: 'Sales Agent',
      role: 'SALES',
      region: 'Ahmedabad'
    },
    create: {
      email: 'sales@prathamtours.com',
      password: hashedPassword,
      name: 'Sales Agent',
      role: 'SALES',
      region: 'Ahmedabad'
    }
  })
  
  console.log('Created Sales User:', user)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
