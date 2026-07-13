import prisma from '../../../config/prisma.js';

export const findManyFeaturedPackages = async () => {
  return await prisma.package.findMany({ where: { featured: true } });
};

export const findManyPackages = async (query = {}) => {
  return await prisma.package.findMany(query);
};

export const findPackageById = async (id) => {
  return await prisma.package.findUnique({ where: { id } });
};

export const createPackage = async (data) => {
  return await prisma.package.create({ data });
};

export const updatePackageById = async (id, data) => {
  return await prisma.package.update({
    where: { id },
    data
  });
};

export const createCustomPackageRequest = async (data) => {
  return await prisma.customPackageRequest.create({ data });
};

export const findCustomPackageRequests = async (query = {}) => {
  return await prisma.customPackageRequest.findMany(query);
};

export const updateCustomPackageRequestById = async (id, status) => {
  return await prisma.customPackageRequest.update({
    where: { id },
    data: { status }
  });
};
