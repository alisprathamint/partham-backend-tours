import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

export const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;

  if (!token) {
    return res.status(403).json({ success: false, message: 'No token provided' });
  }

  try {
    if (!process.env.JWT_SECRET) {
      console.error('[Auth Error]: JWT_SECRET environment variable is missing.');
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check session hash against database for concurrent session control
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || !user.refreshToken) {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    
    const currentSessionHash = user.refreshToken.substring(user.refreshToken.length - 10);
    if (decoded.sessionHash !== currentSessionHash) {
      return res.status(401).json({ success: false, message: 'Session expired because a new login was detected.' });
    }

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
