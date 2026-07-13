import * as leadService from '../services/lead.service.js';

export const getLeads = async (req, res) => {
  try {
    const { type } = req.query; // 'LEAD' or 'QUERY'
    const where = {};

    if (type) {
      where.type = type;
    }

    // Role-based filtering
    if (req.userRole === 'SALES_EXECUTIVE') {
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

export const addLead = async (req, res) => {
  try {
    const { name, email, phone, destination, source, branchId, assignedToId, travelDate, pax, numDays, leadCategory, isDuplicate } = req.body;

    const lead = await leadService.createLead({
      name,
      email,
      phone,
      destination,
      source: source || 'WEBSITE',
      travelDate: travelDate ? new Date(travelDate) : null,
      pax: pax ? parseInt(pax) : null,
      numDays: numDays ? parseInt(numDays) : null,
      leadCategory,
      isDuplicate: isDuplicate || false,
      type: 'LEAD',
      status: assignedToId ? 'ASSIGNED' : 'NEW',
      branchId: branchId ? parseInt(branchId) : null,
      assignedToId: assignedToId ? parseInt(assignedToId) : null
    });

    res.json({ success: true, message: 'Lead created', data: lead });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const bulkAssign = async (req, res) => {
  try {
    const { leadIds, assignedToId, branchId } = req.body;
    
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid data provided' });
    }

    if (!assignedToId && !branchId) {
      return res.status(400).json({ success: false, message: 'Must provide branch or executive to assign' });
    }

    await leadService.bulkAssignLeads(leadIds, assignedToId || null, branchId || null);
    res.json({ success: true, message: 'Leads assigned successfully' });
  } catch (error) {
    console.error('Error bulk assigning leads:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateLead = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, type, travelDate, pax, numDays, leadCategory, isDuplicate, branchId, assignedToId, name, phone, email, destination } = req.body;

    // Check permissions
    const existing = await leadService.findLeadById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    if (req.userRole === 'SALES_EXECUTIVE' && existing.assignedToId !== req.userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Automate moving "NEW" query to "IN_PROGRESS"
    let newStatus = status || existing.status;
    if (existing.type === 'QUERY' && existing.status === 'NEW' && req.method === 'PUT') {
        newStatus = 'IN_PROGRESS';
    }

    const lead = await leadService.updateLeadById(id, {
      status: newStatus,
      type: type || existing.type,
      name: name !== undefined ? name : existing.name,
      phone: phone !== undefined ? phone : existing.phone,
      email: email !== undefined ? email : existing.email,
      destination: destination !== undefined ? destination : existing.destination,
      travelDate: travelDate !== undefined ? (travelDate ? new Date(travelDate) : null) : existing.travelDate,
      pax: pax !== undefined ? (pax ? parseInt(pax) : null) : existing.pax,
      numDays: numDays !== undefined ? (numDays ? parseInt(numDays) : null) : existing.numDays,
      leadCategory: leadCategory !== undefined ? leadCategory : existing.leadCategory,
      isDuplicate: isDuplicate !== undefined ? isDuplicate : existing.isDuplicate,
      branchId: branchId !== undefined ? (branchId ? parseInt(branchId) : null) : existing.branchId,
      assignedToId: assignedToId !== undefined ? (assignedToId ? parseInt(assignedToId) : null) : existing.assignedToId
    });

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
    const existingLead = await leadService.findLeadById(id);
    if (existingLead && existingLead.type === 'QUERY' && existingLead.status === 'NEW') {
      await leadService.updateLeadById(id, { status: 'IN_PROGRESS' });
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
    if (nextAction !== 'Create Query' && nextAction !== 'Lost' && followUpDate) {
      const taskDateTime = new Date(`${followUpDate}T${followUpTime || '12:00'}:00`);
      
      await leadService.createTask({
        leadId: id,
        title: `Follow up: ${nextAction}`,
        dueDate: taskDateTime,
        isCompleted: isCompleted || false,
        createdBy: req.userId
      });
    }

    // 3. Update Lead Status / Type
    let updateData = {};
    if (nextAction === 'Create Query') {
      updateData = { type: 'QUERY', status: 'NEW' };
    } else if (nextAction === 'Lost') {
      updateData = { status: 'LOST' };
    } else if (assignedToId) {
      updateData = { assignedToId: parseInt(assignedToId), status: 'ASSIGNED' };
    }

    if (customerType && lead.leadCategory !== customerType) {
       updateData.leadCategory = customerType; // B2B or B2C
    }

    if (Object.keys(updateData).length > 0) {
      await leadService.updateLeadById(id, updateData);
    }

    res.json({ success: true, message: 'Follow-up saved successfully' });
  } catch (error) {
    console.error('Error saving follow-up:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
