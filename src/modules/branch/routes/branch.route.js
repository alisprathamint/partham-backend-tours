import express from 'express';
import * as branchController from '../controllers/branch.controller.js';
import { verifyToken, isAdmin } from '../../../middlewares/auth.js';

const router = express.Router();

router.get('/', verifyToken, branchController.getBranches);
router.post('/', [verifyToken, isAdmin], branchController.addBranch);
router.put('/:id', [verifyToken, isAdmin], branchController.updateBranch);
router.delete('/:id', [verifyToken, isAdmin], branchController.deleteBranch);

export default router;
