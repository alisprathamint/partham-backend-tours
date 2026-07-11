import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pratham-tours-secret-key-1234';

// Login route (Public)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ 
      where: { email },
      include: { branch: true, managedBranch: true } 
    });
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, branchId: user.branchId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        branch: user.branch,
        managedBranch: user.managedBranch
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create new user (Admin only)
router.post('/register', [verifyToken, isAdmin], async (req, res) => {
  try {
    const { name, email, password, role, branchId } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'SALES_EXECUTIVE',
        branchId: branchId ? parseInt(branchId) : null
      }
    });

    res.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        branchId: newUser.branchId
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all users (Admin only)
router.get('/users', [verifyToken, isAdmin], async (req, res) => {
  try {
    const users = await prisma.user.findMany({
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
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete user (Admin only)
router.delete('/users/:id', [verifyToken, isAdmin], async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.user.delete({ where: { id } });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

// Update profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const userId = req.userId;

    const dataToUpdate = { name, email };
    
    // Check if email is being changed and if it's already in use
    if (email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
    }

    if (password) {
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        branchId: updatedUser.branchId
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
