import express from 'express';
import prisma from '../config/prisma.js';
import { verifyToken, isManagerOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET all leads/queries based on role
router.get('/leads', verifyToken, async (req, res) => {
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
    // SUPER_ADMIN sees everything

    const leads = await prisma.lead.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        notes: true,
        tasks: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: leads });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create new lead (Manual entry or Webhook)
router.post('/leads', verifyToken, async (req, res) => {
  try {
    const { name, email, phone, destination, source, branchId, assignedToId, travelDate, pax, numDays, leadCategory, isDuplicate } = req.body;

    const lead = await prisma.lead.create({
      data: {
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
      }
    });

    res.json({ success: true, message: 'Lead created', data: lead });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Bulk assign leads
router.put('/leads/bulk-assign', verifyToken, async (req, res) => {
  try {
    const { leadIds, assignedToId } = req.body;
    
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0 || !assignedToId) {
      return res.status(400).json({ success: false, message: 'Invalid data provided' });
    }

    await prisma.lead.updateMany({
      where: { id: { in: leadIds.map(id => parseInt(id)) } },
      data: { 
        assignedToId: parseInt(assignedToId),
        status: 'ASSIGNED'
      }
    });

    res.json({ success: true, message: 'Leads assigned successfully' });
  } catch (error) {
    console.error('Error bulk assigning leads:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update lead details
router.put('/leads/:id', verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, type, travelDate, pax, numDays, leadCategory, isDuplicate, branchId, assignedToId, name, phone, email, destination } = req.body;

    // Check permissions
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    if (req.userRole === 'SALES_EXECUTIVE' && existing.assignedToId !== req.userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Automate moving "NEW" query to "IN_PROGRESS"
    let newStatus = status || existing.status;
    if (existing.type === 'QUERY' && existing.status === 'NEW' && req.method === 'PUT') {
        newStatus = 'IN_PROGRESS';
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: {
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
      }
    });

    res.json({ success: true, message: 'Lead updated', data: lead });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete lead/query
router.delete('/leads/:id', verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Check permissions
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    if (req.userRole === 'SALES_EXECUTIVE' && existing.assignedToId !== req.userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Delete associated records first (cascade delete is better but this is safe)
    await prisma.note.deleteMany({ where: { leadId: id } });
    await prisma.task.deleteMany({ where: { leadId: id } });
    
    await prisma.lead.delete({ where: { id } });

    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Convert Lead to Query
router.post('/leads/:id/convert', verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const lead = await prisma.lead.update({
      where: { id },
      data: {
        type: 'QUERY',
        status: 'NEW'
      }
    });

    res.json({ success: true, message: 'Successfully converted to Query', data: lead });
  } catch (error) {
    console.error('Error converting lead:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add Note
router.post('/leads/:id/notes', verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { content } = req.body;

    const note = await prisma.note.create({
      data: {
        leadId: id,
        content,
        createdBy: req.userId
      }
    });

    // Automate moving "NEW" query to "IN_PROGRESS"
    const existingLead = await prisma.lead.findUnique({ where: { id } });
    if (existingLead && existingLead.type === 'QUERY' && existingLead.status === 'NEW') {
      await prisma.lead.update({
        where: { id },
        data: { status: 'IN_PROGRESS' }
      });
    }

    res.json({ success: true, data: note });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add Task
router.post('/leads/:id/tasks', verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, dueDate } = req.body;

    const task = await prisma.task.create({
      data: {
        leadId: id,
        title,
        dueDate: new Date(dueDate),
        createdBy: req.userId
      }
    });

    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Handle Detailed Follow-Up
router.post('/leads/:id/follow-up', verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { 
      activityType, callDirection, outcome, nextAction, 
      followUpDate, followUpTime, assignedToId, 
      customerType, details, isCompleted, reminderMinutes 
    } = req.body;

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    // 1. Create a Note summarizing the interaction
    const noteContent = `[${activityType}${callDirection ? ` - ${callDirection}` : ''}] Outcome: ${outcome}\nAction: ${nextAction}\nDetails: ${details || 'No remarks'}`;
    await prisma.note.create({
      data: {
        leadId: id,
        content: noteContent,
        createdBy: req.userId
      }
    });

    // 2. Handle Task/Reminder creation
    if (nextAction !== 'Create Query' && nextAction !== 'Lost' && followUpDate) {
      // Combine date and time
      const taskDateTime = new Date(`${followUpDate}T${followUpTime || '12:00'}:00`);
      
      await prisma.task.create({
        data: {
          leadId: id,
          title: `Follow up: ${nextAction}`,
          dueDate: taskDateTime,
          isCompleted: isCompleted || false,
          createdBy: req.userId
          // Future enhancement: Add assignedTo to Task if different from creator
        }
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
      await prisma.lead.update({
        where: { id },
        data: updateData
      });
    }

    res.json({ success: true, message: 'Follow-up saved successfully' });
  } catch (error) {
    console.error('Error saving follow-up:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
