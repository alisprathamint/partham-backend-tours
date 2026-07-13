import * as settingsService from '../services/settings.service.js';

export const getSettings = async (req, res) => {
  try {
    const settings = await settingsService.findAllSettings();
    const settingsObj = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    
    res.json({ success: true, data: settingsObj });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const settingsUpdate = req.body;
    
    const promises = Object.entries(settingsUpdate).map(([key, value]) => {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      return settingsService.upsertSetting(key, stringValue);
    });

    await Promise.all(promises);
    
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
};
