import prisma from '../../../config/prisma.js';

export const createDocument = async (data) => {
  return await prisma.customerDocument.create({ data });
};

export const findDocumentsByLeadId = async (leadId) => {
  return await prisma.customerDocument.findMany({
    where: { leadId },
    orderBy: { createdAt: 'desc' }
  });
};

export const findDocumentById = async (id) => {
  return await prisma.customerDocument.findUnique({ where: { id } });
};

export const updateDocumentById = async (id, data) => {
  return await prisma.customerDocument.update({ where: { id }, data });
};

export const deleteDocumentById = async (id) => {
  return await prisma.customerDocument.delete({ where: { id } });
};
