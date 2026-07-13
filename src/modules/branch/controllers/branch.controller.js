import * as branchService from '../services/branch.service.js';

export const getBranches = async (req, res) => {
  try {
    const branches = await branchService.findManyBranches();
    res.json({ success: true, data: branches });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const addBranch = async (req, res) => {
  try {
    const { name, city, phone, email, isMain, status, managerId } = req.body;

    const existing = await branchService.findBranchByName(name);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Branch name already exists' });
    }

    const branch = await branchService.createBranch({
      name,
      city,
      phone,
      email,
      isMain: isMain !== undefined ? isMain : false,
      status: status || 'ACTIVE',
      managerId: managerId ? parseInt(managerId) : null
    });

    res.json({ success: true, message: 'Branch created successfully', data: branch });
  } catch (error) {
    console.error('Error creating branch:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateBranch = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, city, phone, email, isMain, status, managerId } = req.body;

    const branch = await branchService.updateBranchById(id, {
      name,
      city,
      phone,
      email,
      isMain: isMain !== undefined ? isMain : false,
      status: status || 'ACTIVE',
      managerId: managerId ? parseInt(managerId) : null
    });

    res.json({ success: true, message: 'Branch updated', data: branch });
  } catch (error) {
    console.error('Error updating branch:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteBranch = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await branchService.deleteBranchById(id);
    res.json({ success: true, message: 'Branch deleted' });
  } catch (error) {
    console.error('Error deleting branch:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
