import * as leadService from '../services/lead.service.js';
import { sendToUser, broadcast } from '../../../utils/wsManager.js';

export const getLeads = async (req, res) => {
  try {
    const { type } = req.query; // 'LEAD' or 'QUERY'
    const where = {};

    if (type) {
      where.type = type;
    }

    // Role-based filtering
    if (req.userRole === 'SALES_EXECUTIVE' || req.userRole === 'SALES') {
      where.assignedToId = req.userId;
    } else if (req.userRole === 'BRANCH_MANAGER') {
      where.branchId = req.userBranchId;
    }

    const leads = await leadService.findLeads(where);
    res.json({ success: true, data: leads });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

import { createNotification } from '../../../controllers/notificationController.js';

export const addLead = async (req, res) => {
  try {
    const { name, email, phone, destination, origin, priceRange, foodPref, inclusions, theme, source, branchId, assignedToId, travelDate, pax, numDays, leadCategory, isDuplicate } = req.body;

    const lead = await leadService.createLead({
      name,
      email,
      phone,
      destination,
      origin,
      priceRange,
      foodPref,
      inclusions: inclusions || [],
      theme: theme || [],
      source: source || 'WEBSITE',
      travelDate: travelDate ? new Date(travelDate) : null,
      pax: pax ? parseInt(pax) : null,
      numDays: numDays ? parseInt(numDays) : null,
      leadCategory,
      isDuplicate: isDuplicate || false,
      type: req.body.type || 'LEAD',
      status: req.body.status || (assignedToId ? 'ASSIGNED' : 'NEW'),
      branchId: branchId ? parseInt(branchId) : null,
      assignedToId: assignedToId ? parseInt(assignedToId) : null
    });

    if (lead.assignedToId) {
      await createNotification({
        userId: lead.assignedToId,
        title: 'New Lead Assigned',
        message: `You have been assigned a new lead: ${lead.name}`,
        type: 'INFO',
        relatedEntity: 'LEAD',
        entityId: lead.id
      });
      // Push real-time event to assigned executive
      sendToUser(lead.assignedToId, 'lead_assigned', {
        leadId: lead.id,
        message: `You have been assigned a new lead: ${lead.name}`
      });
    }

    broadcast('lead_updated', { action: 'create', leadId: lead.id });
    res.json({ success: true, message: 'Lead created', data: lead });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const bulkAssign = async (req, res) => {
  try {
    const { leadIds, assignedToId, branchId, assignMode, strategy, executiveIds, priorities } = req.body;
    
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid data provided' });
    }

    if (assignMode === 'STRATEGIC' || (strategy && executiveIds && executiveIds.length > 0)) {
      if (!executiveIds || !Array.isArray(executiveIds) || executiveIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Must select at least one executive for strategic assignment' });
      }

      const assignments = await leadService.strategicAssignLeads(leadIds, branchId, strategy, executiveIds, priorities);
      
      const execMap = {};
      assignments.forEach(assign => {
        if (!execMap[assign.assignedToId]) {
          execMap[assign.assignedToId] = 0;
        }
        execMap[assign.assignedToId]++;
      });

      await Promise.all(Object.keys(execMap).map(async (execId) => {
        const parsedExecId = parseInt(execId);
        await createNotification({
          userId: parsedExecId,
          title: 'New Leads Assigned (Strategic)',
          message: `You have been assigned ${execMap[execId]} new lead(s) via strategic assignment.`,
          type: 'INFO',
          relatedEntity: 'LEAD',
        });
        // Push real-time event to each assigned executive
        sendToUser(parsedExecId, 'lead_assigned', {
          count: execMap[execId],
          message: `You have been assigned ${execMap[execId]} new lead(s) via strategic assignment.`
        });
      }));
    } else {
      if (!assignedToId && !branchId) {
        return res.status(400).json({ success: false, message: 'Must provide branch or executive to assign' });
      }

      await leadService.bulkAssignLeads(leadIds, assignedToId || null, branchId || null);

      if (assignedToId) {
        const parsedAssignedToId = parseInt(assignedToId);
        await createNotification({
          userId: parsedAssignedToId,
          title: 'New Leads Assigned',
          message: `You have been bulk-assigned ${leadIds.length} new lead(s).`,
          type: 'INFO',
          relatedEntity: 'LEAD',
        });
        // Push real-time event to assigned executive
        sendToUser(parsedAssignedToId, 'lead_assigned', {
          count: leadIds.length,
          message: `You have been bulk-assigned ${leadIds.length} new lead(s).`
        });
      }
    }

    broadcast('lead_updated', { action: 'assign', leadIds });
    res.json({ success: true, message: 'Leads assigned successfully' });
  } catch (error) {
    console.error('Error bulk assigning leads:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


export const updateLead = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, type, travelDate, pax, numDays, leadCategory, isDuplicate, branchId, assignedToId, name, phone, email, destination, origin, priceRange, foodPref, inclusions, theme, passengerDetails } = req.body;

    // Check permissions
    const existing = await leadService.findLeadById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    if (req.userRole === 'SALES_EXECUTIVE' && existing.assignedToId !== req.userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Automate moving "NEW" query to "IN_PROGRESS"
    // Automate moving "PROPOSAL_SENT" query to "NEGOTIATION"
    let newStatus = status || existing.status;
    if (existing.type === 'QUERY' && req.method === 'PUT') {
        if (existing.status === 'NEW') {
            newStatus = 'IN_PROGRESS';
        } else if (existing.status === 'PROPOSAL_SENT') {
            newStatus = 'NEGOTIATION';
        }
    }

    const lead = await leadService.updateLeadById(id, {
      status: newStatus,
      type: type || existing.type,
      name: name !== undefined ? name : existing.name,
      phone: phone !== undefined ? phone : existing.phone,
      email: email !== undefined ? email : existing.email,
      destination: destination !== undefined ? destination : existing.destination,
      origin: origin !== undefined ? origin : existing.origin,
      priceRange: priceRange !== undefined ? priceRange : existing.priceRange,
      foodPref: foodPref !== undefined ? foodPref : existing.foodPref,
      inclusions: inclusions !== undefined ? inclusions : existing.inclusions,
      theme: theme !== undefined ? theme : existing.theme,
      travelDate: travelDate !== undefined ? (travelDate ? new Date(travelDate) : null) : existing.travelDate,
      pax: pax !== undefined ? (pax ? parseInt(pax) : null) : existing.pax,
      numDays: numDays !== undefined ? (numDays ? parseInt(numDays) : null) : existing.numDays,
      leadCategory: leadCategory !== undefined ? leadCategory : existing.leadCategory,
      isDuplicate: isDuplicate !== undefined ? isDuplicate : existing.isDuplicate,
      branchId: branchId !== undefined ? (branchId ? parseInt(branchId) : null) : existing.branchId,
      assignedToId: assignedToId !== undefined ? (assignedToId ? parseInt(assignedToId) : null) : existing.assignedToId,
      passengerDetails: passengerDetails !== undefined ? passengerDetails : existing.passengerDetails
    });

    broadcast('lead_updated', { action: 'update', leadId: lead.id });
    res.json({ success: true, message: 'Lead updated', data: lead });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteLead = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Check permissions
    const existing = await leadService.findLeadById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    if (req.userRole === 'SALES_EXECUTIVE' && existing.assignedToId !== req.userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Delete associated records first
    await leadService.deleteNotesByLeadId(id);
    await leadService.deleteTasksByLeadId(id);
    
    await leadService.deleteLeadById(id);

    broadcast('lead_updated', { action: 'delete', leadId: id });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const convertLead = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const lead = await leadService.updateLeadById(id, {
      type: 'QUERY',
      status: 'NEW'
    });

    broadcast('lead_updated', { action: 'convert', leadId: lead.id });
    res.json({ success: true, message: 'Successfully converted to Query', data: lead });
  } catch (error) {
    console.error('Error converting lead:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const addNote = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { content } = req.body;

    const note = await leadService.createNote({
      leadId: id,
      content,
      createdBy: req.userId
    });

    // Automate moving "NEW" query to "IN_PROGRESS"
    // And automate moving "PROPOSAL_SENT" query to "NEGOTIATION"
    // And automate moving "NEGOTIATION" query to "WON" based on note content
    const existingLead = await leadService.findLeadById(id);
    if (existingLead && existingLead.type === 'QUERY') {
      const lowerNote = content.toLowerCase();
      if (existingLead.status === 'NEW') {
        await leadService.updateLeadById(id, { status: 'IN_PROGRESS' });
      } else if (existingLead.status === 'NEGOTIATION' && (lowerNote.includes('confirm') || lowerNote.includes('paid') || lowerNote.includes('book') || lowerNote.includes('won') || lowerNote.includes('done') || lowerNote.includes('advance'))) {
        await leadService.updateLeadById(id, { status: 'WON' });
      }
    }

    res.json({ success: true, data: note });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const addTask = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, dueDate } = req.body;

    const task = await leadService.createTask({
      leadId: id,
      title,
      dueDate: new Date(dueDate),
      createdBy: req.userId
    });

    res.json({ success: true, data: task });
  } catch (error) {
    console.error('Error adding task:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const handleFollowUp = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { 
      activityType, callDirection, outcome, nextAction, 
      followUpDate, followUpTime, assignedToId, 
      customerType, details, isCompleted, reminderMinutes 
    } = req.body;

    const lead = await leadService.findLeadById(id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    // 1. Create a Note summarizing the interaction
    const noteContent = `[${activityType}${callDirection ? ` - ${callDirection}` : ''}] Outcome: ${outcome}\nAction: ${nextAction}\nDetails: ${details || 'No remarks'}`;
    await leadService.createNote({
      leadId: id,
      content: noteContent,
      createdBy: req.userId
    });

    // 2. Handle Task/Reminder creation
    if (nextAction !== 'Create Query' && nextAction !== 'Lost' && nextAction !== 'Deal Lost' && followUpDate) {
      const taskDateTime = new Date(`${followUpDate}T${followUpTime || '12:00'}:00`);
      const targetAssignee = assignedToId ? parseInt(assignedToId) : (lead.assignedToId || req.userId);
      
      await leadService.createTask({
        leadId: id,
        title: `Follow up: ${nextAction}`,
        note: details || null,
        dueDate: taskDateTime,
        isCompleted: isCompleted || false,
        assignedToId: targetAssignee,
        createdBy: req.userId
      });
    }

    // 3. Update Lead Status / Type
    let updateData = {};
    
    if (nextAction === 'Lost' || nextAction === 'Deal Lost') {
      // Only Lost action keeps it as a lead
      updateData.status = 'LOST';
      updateData.assignedToId = assignedToId ? parseInt(assignedToId) : (lead.assignedToId || req.userId);
    } else {
      // ALL other actions (Create Query, Call Back, WhatsApp, Meeting, Send Quotation)
      // → Convert LEAD to QUERY automatically so it appears in My Queries
      if (lead.type === 'LEAD') {
        updateData.type = 'QUERY';
        updateData.status = 'IN_PROGRESS';
      }
      // Always assign to current user if no explicit assignee chosen
      updateData.assignedToId = assignedToId ? parseInt(assignedToId) : (lead.assignedToId || req.userId);
    }

    if (customerType && lead.leadCategory !== customerType) {
       updateData.leadCategory = customerType;
    }

    if (Object.keys(updateData).length > 0) {
      await leadService.updateLeadById(id, updateData);
    }

    // Automate moving QUERY stages based on Follow Up
    if (lead && lead.type === 'QUERY') {
      const lowerNote = noteContent.toLowerCase();
      if (lead.status === 'NEW') {
        await leadService.updateLeadById(id, { status: 'IN_PROGRESS' });
      } else if (lead.status === 'NEGOTIATION' && (lowerNote.includes('confirm') || lowerNote.includes('paid') || lowerNote.includes('book') || lowerNote.includes('won') || lowerNote.includes('done') || lowerNote.includes('advance'))) {
        await leadService.updateLeadById(id, { status: 'WON' });
      }
    }

    res.json({ success: true, message: 'Follow-up saved successfully' });
  } catch (error) {
    console.error('Error saving follow-up:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getUpcomingTasks = async (req, res) => {
  try {
    const tasks = await leadService.findUpcomingTasks(req.userId);
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Error fetching upcoming tasks:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const completeTask = async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const body = req.body || {};
    const { isCompleted } = body;
    const targetStatus = isCompleted !== undefined ? isCompleted : true;
    const task = await leadService.updateTaskStatus(taskId, targetStatus);
    res.json({ success: true, data: task });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const snoozeTask = async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const { minutes = 15 } = req.body;
    const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000);
    
    const task = await leadService.updateTask(taskId, { 
      snoozedUntil,
      reminderSent: false // Reset so scheduler re-sends when snoozedUntil passes
    });
    res.json({ success: true, data: task });
  } catch (error) {
    console.error('Error snoozing task:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const rescheduleTask = async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const { dueDate, dueTime } = req.body;
    
    if (!dueDate) return res.status(400).json({ success: false, message: 'dueDate is required' });
    
    const newDueDate = new Date(`${dueDate}T${dueTime || '09:00'}:00`);
    
    const task = await leadService.updateTask(taskId, { 
      dueDate: newDueDate,
      reminderSent: false, // Reset so scheduler sends a new reminder
      snoozedUntil: null
    });
    res.json({ success: true, data: task });
  } catch (error) {
    console.error('Error rescheduling task:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
