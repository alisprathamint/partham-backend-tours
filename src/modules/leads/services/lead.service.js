import prisma from '../../../config/prisma.js';

export const findLeads = async (where) => {
  return await prisma.lead.findMany({
    where,
    include: {
      assignedTo: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
      notes: true,
      tasks: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

export const findLeadById = async (id) => {
  return await prisma.lead.findUnique({
    where: { id }
  });
};

export const createLead = async (data) => {
  return await prisma.lead.create({
    data
  });
};

export const bulkAssignLeads = async (leadIds, assignedToId, branchId) => {
  const data = {
    assignedToId: assignedToId ? parseInt(assignedToId) : null,
    status: 'ASSIGNED'
  };
  
  if (branchId) {
    data.branchId = parseInt(branchId);
  }

  return await prisma.lead.updateMany({
    where: { id: { in: leadIds.map(id => parseInt(id)) } },
    data
  });
};

export const updateLeadById = async (id, data) => {
  return await prisma.lead.update({
    where: { id },
    data
  });
};

export const deleteNotesByLeadId = async (leadId) => {
  return await prisma.note.deleteMany({
    where: { leadId }
  });
};

export const deleteTasksByLeadId = async (leadId) => {
  return await prisma.task.deleteMany({
    where: { leadId }
  });
};

export const deleteLeadById = async (id) => {
  return await prisma.lead.delete({
    where: { id }
  });
};

export const createNote = async (data) => {
  return await prisma.note.create({
    data
  });
};

export const createTask = async (data) => {
  return await prisma.task.create({
    data
  });
};
