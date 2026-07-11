import express from 'express';
import prisma from '../config/prisma.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all branches
router.get('/', verifyToken, async (req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      include: {
        manager: { select: { id: true, name: true, email: true } },
        _count: { select: { users: true, leads: true } }
      }
    });
    res.json({ success: true, data: branches });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create new branch (Super Admin only)
router.post('/', [verifyToken, isAdmin], async (req, res) => {
  try {
    const { name, city, managerId } = req.body;

    const existing = await prisma.branch.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Branch name already exists' });
    }

    const branch = await prisma.branch.create({
      data: {
        name,
        city,
        managerId: managerId ? parseInt(managerId) : null
      }
    });

    res.json({ success: true, message: 'Branch created successfully', data: branch });
  } catch (error) {
    console.error('Error creating branch:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update branch
router.put('/:id', [verifyToken, isAdmin], async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, city, managerId } = req.body;

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        name,
        city,
        managerId: managerId ? parseInt(managerId) : null
      }
    });

    res.json({ success: true, message: 'Branch updated', data: branch });
  } catch (error) {
    console.error('Error updating branch:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete branch
router.delete('/:id', [verifyToken, isAdmin], async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.branch.delete({ where: { id } });
    res.json({ success: true, message: 'Branch deleted' });
  } catch (error) {
    console.error('Error deleting branch:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
