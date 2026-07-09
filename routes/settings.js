import express from 'express';
import prisma from '../config/prisma.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/settings - Get all settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await prisma.siteSetting.findMany();
    // Convert array to key-value object
    const settingsObj = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    
    res.json({ success: true, data: settingsObj });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// POST /api/settings - Update settings (upsert multiple keys)
router.post('/settings', [verifyToken, isAdmin], async (req, res) => {
  try {
    const settingsUpdate = req.body; // e.g. { heroHeadline: "...", aboutUsTitle: "..." }
    
    // Process each key-value pair
    const promises = Object.entries(settingsUpdate).map(([key, value]) => {
      // Ensure value is a string (stringify JSON if needed)
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      
      return prisma.siteSetting.upsert({
        where: { key: key },
        update: { value: stringValue },
        create: { key: key, value: stringValue },
      });
    });

    await Promise.all(promises);
    
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
});

export default router;
