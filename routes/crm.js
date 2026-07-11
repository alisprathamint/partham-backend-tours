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
    const { name, email, phone, destination, source, branchId, assignedToId } = req.body;

    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        phone,
        destination,
        source: source || 'WEBSITE',
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

// Update lead (Assign, Change Status)
router.put('/leads/:id', verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, branchId, assignedToId, type } = req.body;

    // Check permissions
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    if (req.userRole === 'SALES_EXECUTIVE' && existing.assignedToId !== req.userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        status: status || existing.status,
        type: type || existing.type,
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

// Convert Lead to Query
router.post('/leads/:id/convert', verifyToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const lead = await prisma.lead.update({
      where: { id },
      data: {
        type: 'QUERY',
        status: 'IN_PROGRESS'
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

export default router;
