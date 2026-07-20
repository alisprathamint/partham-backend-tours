import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as authService from '../services/auth.service.js';
import { sendToUser, wsConnections } from '../../../utils/wsManager.js';

const JWT_SECRET = process.env.JWT_SECRET || 'pratham-tours-secret-key-1234';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'pratham-tours-refresh-secret-5678';

// Keep activeConnections for backward compatibility (SSE session-stream)
export const activeConnections = new Map();

export const sessionStream = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.flushHeaders();

  const userId = req.userId;
  
  // Send an initial connection success event
  res.write('data: {"status": "connected"}\n\n');

  // Store connection
  activeConnections.set(userId, res);

  req.on('close', () => {
    if (activeConnections.get(userId) === res) {
      activeConnections.delete(userId);
    }
  });
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await authService.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Incorrect Email' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Incorrect Password' });
    }

    const refreshToken = jwt.sign(
      { id: user.id },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' } // Refresh token valid for 7 days
    );

    const sessionHash = refreshToken.substring(refreshToken.length - 10);

    const token = jwt.sign(
      { id: user.id, role: user.role, branchId: user.branchId, sessionHash },
      JWT_SECRET,
      { expiresIn: '15m' } // Changed back to 15 minutes for security
    );

    // Save refresh token to database
    await authService.updateUserById(user.id, { refreshToken });

    res.json({
      success: true,
      token,
      refreshToken,
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
};

export const refreshToken = async (req, res) => {
  try {
    const { token: oldRefreshToken } = req.body;
    
    if (!oldRefreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token is required' });
    }

    // Verify the refresh token
    let decoded;
    try {
      decoded = jwt.verify(oldRefreshToken, JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    // Check if user still exists and fetch full object including refreshToken
    const user = await authService.findUserById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }

    // Verify token matches the one in DB
    if (user.refreshToken !== oldRefreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token is invalid or has been revoked' });
    }

    // Issue a new access token
    const sessionHash = user.refreshToken.substring(user.refreshToken.length - 10);
    const newAccessToken = jwt.sign(
      { id: user.id, role: user.role, branchId: user.branchId, sessionHash },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      success: true,
      token: newAccessToken
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const logout = async (req, res) => {
  try {
    const userId = req.userId;
    if (userId) {
      await authService.updateUserById(userId, { refreshToken: null });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Server error during logout' });
  }
};

export const register = async (req, res) => {
  try {
    let { name, email, password, role, branchId } = req.body;

    // Enforce Branch Manager constraints
    if (req.userRole === 'BRANCH_MANAGER') {
      role = 'SALES_EXECUTIVE';
      branchId = req.userBranchId;
    }

    const existingUser = await authService.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await authService.createUser({
      name,
      email,
      password: hashedPassword,
      role: role || 'SALES_EXECUTIVE',
      branchId: branchId ? parseInt(branchId) : null
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
};

export const getUsers = async (req, res) => {
  try {
    let users = await authService.getAllUsers();
    
    // Enforce Branch Manager constraints
    if (req.userRole === 'BRANCH_MANAGER') {
      users = users.filter(u => u.branchId === req.userBranchId);
    }
    
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (req.userRole === 'BRANCH_MANAGER') {
      const users = await authService.getAllUsers();
      const userToDelete = users.find(u => u.id === id);
      if (!userToDelete || userToDelete.branchId !== req.userBranchId || userToDelete.role !== 'SALES_EXECUTIVE') {
        return res.status(403).json({ success: false, message: 'Forbidden: Cannot delete this user' });
      }
    }

    await authService.deleteUserById(id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, password, role, branchId, status } = req.body;

    const users = await authService.getAllUsers();
    const userToUpdate = users.find(u => u.id === id);

    if (!userToUpdate) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Enforce Branch Manager constraints
    if (req.userRole === 'BRANCH_MANAGER') {
      if (userToUpdate.branchId !== req.userBranchId || userToUpdate.role !== 'SALES_EXECUTIVE') {
        return res.status(403).json({ success: false, message: 'Forbidden: Cannot update this user' });
      }
    }

    const dataToUpdate = { name, email };
    if (status) dataToUpdate.status = status;
    if (password) {
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }
    
    // Only admins can change role and branch
    if (req.userRole === 'SUPER_ADMIN' || req.userRole === 'ADMIN') {
      if (role) dataToUpdate.role = role;
      if (branchId !== undefined) dataToUpdate.branchId = branchId ? parseInt(branchId) : null;
    }

    const updatedUser = await authService.updateUserById(id, dataToUpdate);

    res.json({ success: true, message: 'User updated successfully', data: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const userId = req.userId;

    const dataToUpdate = { name, email };
    
    if (email) {
      const existingUser = await authService.findUserByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
    }

    if (password) {
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await authService.updateUserById(userId, dataToUpdate);

    const fullUser = await authService.findUserById(userId);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: fullUser.id,
        name: fullUser.name,
        email: fullUser.email,
        role: fullUser.role,
        branchId: fullUser.branchId,
        branch: fullUser.branch,
        managedBranch: fullUser.managedBranch
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
