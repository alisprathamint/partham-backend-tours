import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(403).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pratham-tours-secret-key-1234');
    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.userBranchId = decoded.branchId;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.userRole !== 'SUPER_ADMIN' && req.userRole !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Requires Super Admin role' });
  }
  next();
};

export const isManagerOrAdmin = (req, res, next) => {
  if (req.userRole !== 'SUPER_ADMIN' && req.userRole !== 'ADMIN' && req.userRole !== 'BRANCH_MANAGER') {
    return res.status(403).json({ success: false, message: 'Requires Manager or Admin role' });
  }
  next();
};
