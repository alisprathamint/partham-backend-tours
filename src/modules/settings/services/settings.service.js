import prisma from '../../../config/prisma.js';

export const findAllSettings = async () => {
  return await prisma.siteSetting.findMany();
};

export const upsertSetting = async (key, value) => {
  return await prisma.siteSetting.upsert({
    where: { key: key },
    update: { value: value },
    create: { key: key, value: value },
  });
};
