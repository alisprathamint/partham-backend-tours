import prisma from '../../../config/prisma.js';

export const findUserByEmail = async (email) => {
  return await prisma.user.findUnique({
    where: { email },
    include: { branch: true, managedBranch: true }
  });
};

export const findUserById = async (id) => {
  return await prisma.user.findUnique({
    where: { id },
    include: { branch: true, managedBranch: true }
  });
};

export const createUser = async (data) => {
  return await prisma.user.create({
    data
  });
};

export const getAllUsers = async () => {
  return await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      branchId: true,
      branch: { select: { name: true, city: true } },
      createdAt: true
    }
  });
};

export const deleteUserById = async (id) => {
  return await prisma.user.delete({
    where: { id }
  });
};

export const updateUserById = async (id, data) => {
  return await prisma.user.update({
    where: { id },
    data
  });
};
