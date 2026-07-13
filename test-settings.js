import prisma from './src/config/prisma.js';
async function test() {
  const s = await prisma.siteSetting.findUnique({where: {key: 'homeHeroSlides'}});
  console.log("homeHeroSlides DB value:");
  console.log(s?.value);
}
test();
