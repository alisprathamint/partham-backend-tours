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
    status: 'NEW', // Go to 'New Query' stage
    type: 'QUERY' // Convert to Query when assigned
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

export const updateTask = async (taskId, data) => {
  return await prisma.task.update({
    where: { id: parseInt(taskId) },
    data
  });
};

export const findUpcomingTasks = async (userId) => {
  const now = new Date();
  const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  return await prisma.task.findMany({
    where: {
      isCompleted: false,
      dueDate: {
        gte: past24h,
        lte: now,
      },
      OR: [
        { assignedToId: userId },
        { createdBy: userId }
      ],
    },
    include: {
      lead: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          type: true,
          status: true,
          destination: true,
        }
      }
    },
    orderBy: {
      dueDate: 'asc'
    }
  });
};

export const updateTaskStatus = async (taskId, isCompleted) => {
  return await prisma.task.update({
    where: { id: parseInt(taskId) },
    data: { isCompleted }
  });
};
