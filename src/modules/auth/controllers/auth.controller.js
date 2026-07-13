import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as authService from '../services/auth.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'pratham-tours-secret-key-1234';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await authService.findUserByEmail(email);
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
};
