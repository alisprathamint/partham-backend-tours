import prisma from '../../../config/prisma.js';

export const findManyBranches = async () => {
  return await prisma.branch.findMany({
    orderBy: { name: 'asc' },
    include: {
      manager: { select: { id: true, name: true, email: true } },
      _count: { select: { users: true, leads: true } }
    }
  });
};

export const findBranchByName = async (name) => {
  return await prisma.branch.findUnique({
    where: { name }
  });
};

export const createBranch = async (data) => {
  return await prisma.branch.create({
    data
  });
};

export const updateBranchById = async (id, data) => {
  return await prisma.branch.update({
    where: { id },
    data
  });
};

export const deleteBranchById = async (id) => {
  return await prisma.branch.delete({
    where: { id }
  });
};
