import prisma from '../../../config/prisma.js';

export const findManyDestinations = async (query = {}) => {
  return await prisma.destination.findMany(query);
};

export const findDestinationById = async (id) => {
  return await prisma.destination.findUnique({ where: { id } });
};

export const findDestinationsByMonth = async (monthNum) => {
  return await prisma.destination.findMany({
    where: {
      favorableMonths: {
        has: monthNum
      }
    }
  });
};

export const createDestination = async (data) => {
  return await prisma.destination.create({ data });
};

export const updateDestinationById = async (id, data) => {
  return await prisma.destination.update({
    where: { id },
    data
  });
};

export const deleteDestinationById = async (id) => {
  return await prisma.destination.delete({
    where: { id }
  });
};

export const findManyPackages = async (query = {}) => {
  return await prisma.package.findMany(query);
};
