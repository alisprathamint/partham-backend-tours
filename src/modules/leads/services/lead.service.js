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

export const strategicAssignLeads = async (leadIds, branchId, strategy, executiveIds, priorities) => {
  const parsedLeadIds = leadIds.map(id => parseInt(id));
  const parsedExecutiveIds = executiveIds.map(id => parseInt(id));
  const parsedBranchId = branchId ? parseInt(branchId) : null;

  if (parsedExecutiveIds.length === 0) {
    throw new Error('No executives selected for strategic assignment');
  }

  const assignments = [];

  const distributeWeighted = (leadsList, executivesWithWeights) => {
    leadsList.forEach((leadId) => {
      executivesWithWeights.sort((a, b) => {
        const deficitA = (a.leadsAssignedCount + 1) / a.weight;
        const deficitB = (b.leadsAssignedCount + 1) / b.weight;
        return deficitA - deficitB;
      });
      const targetExec = executivesWithWeights[0];
      assignments.push({ leadId, assignedToId: targetExec.id });
      targetExec.leadsAssignedCount += 1;
    });
  };

  if (strategy === 'ROUND_ROBIN') {
    parsedLeadIds.forEach((leadId, idx) => {
      const assignedToId = parsedExecutiveIds[idx % parsedExecutiveIds.length];
      assignments.push({ leadId, assignedToId });
    });
  } else if (strategy === 'LEAST_LOADED') {
    const activeStatuses = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'PROPOSAL_SENT', 'NEGOTIATION', 'BOOKING_CONFIRMED'];
    
    const executiveLoads = await Promise.all(parsedExecutiveIds.map(async (execId) => {
      const count = await prisma.lead.count({
        where: {
          assignedToId: execId,
          status: { in: activeStatuses }
        }
      });
      return { id: execId, count };
    }));

    parsedLeadIds.forEach((leadId) => {
      executiveLoads.sort((a, b) => a.count - b.count);
      const targetExec = executiveLoads[0];
      assignments.push({ leadId, assignedToId: targetExec.id });
      targetExec.count += 1;
    });
  } else if (strategy === 'PRIORITY_WEIGHTED') {
    const executivesWithWeights = parsedExecutiveIds.map(execId => {
      const weight = priorities && priorities[execId] ? parseInt(priorities[execId]) : 1;
      return { id: execId, weight, leadsAssignedCount: 0 };
    });
    distributeWeighted(parsedLeadIds, executivesWithWeights);
  } else if (strategy === 'PERFORMANCE_BASED') {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const executivesWithWeights = await Promise.all(parsedExecutiveIds.map(async (execId) => {
      const totalLeads = await prisma.lead.count({
        where: {
          assignedToId: execId,
          createdAt: { gte: thirtyDaysAgo }
        }
      });
      const wonLeads = await prisma.lead.count({
        where: {
          assignedToId: execId,
          status: 'WON',
          createdAt: { gte: thirtyDaysAgo }
        }
      });
      
      let weight = 1;
      if (totalLeads > 0) {
        const conversionRate = wonLeads / totalLeads;
        weight = Math.max(1, Math.round(conversionRate * 10));
      }
      return { id: execId, weight, leadsAssignedCount: 0 };
    }));
    distributeWeighted(parsedLeadIds, executivesWithWeights);
  } else {
    throw new Error(`Unsupported strategy: ${strategy}`);
  }

  const updatePromises = assignments.map(assign => {
    const data = {
      assignedToId: assign.assignedToId,
      status: 'ASSIGNED'
    };
    if (parsedBranchId) {
      data.branchId = parsedBranchId;
    }
    return prisma.lead.update({
      where: { id: assign.leadId },
      data
    });
  });

  await prisma.$transaction(updatePromises);
  return assignments;
};

