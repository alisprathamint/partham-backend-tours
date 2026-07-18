import fs from 'fs';
import path from 'path';
import { uploadsDir } from '../../../config/multer.js';
import * as docService from '../services/document.service.js';

const DOCUMENT_CATEGORY_MAP = {
  AADHAAR: 'IDENTITY',
  PAN: 'IDENTITY',
  PASSPORT: 'TRAVEL',
  DRIVING_LICENCE: 'IDENTITY',
  VOTER_ID: 'IDENTITY',
  VISA: 'TRAVEL',
  TRAVEL_INSURANCE: 'TRAVEL',
  BIRTH_CERTIFICATE: 'OTHER',
  OTHER: 'OTHER',
};

const getFileUrl = (file) => {
  if (!file) return '';
  if (process.env.VERCEL === '1') return `/tmp/${file.filename}`;
  const relative = path.relative(uploadsDir, file.destination).replace(/\\/g, '/');
  return `/uploads/${relative ? relative + '/' : ''}${file.filename}`;
};

// GET /api/crm/leads/:leadId/documents
export const getDocuments = async (req, res) => {
  try {
    const leadId = parseInt(req.params.leadId);
    if (isNaN(leadId)) return res.status(400).json({ success: false, message: 'Invalid lead ID' });

    const docs = await docService.findDocumentsByLeadId(leadId);
    res.json({ success: true, data: docs });
  } catch (err) {
    console.error('Error fetching documents:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/crm/leads/:leadId/documents
export const uploadDocument = async (req, res) => {
  try {
    const leadId = parseInt(req.params.leadId);
    if (isNaN(leadId)) return res.status(400).json({ success: false, message: 'Invalid lead ID' });

    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const { documentType, customDocumentName, docNumber, issueDate, expiryDate, passengerIndex, passengerLabel } = req.body;

    if (!documentType) {
      return res.status(400).json({ success: false, message: 'documentType is required' });
    }
    if (documentType === 'OTHER' && !customDocumentName?.trim()) {
      return res.status(400).json({ success: false, message: 'customDocumentName is required when type is OTHER' });
    }

    const category = DOCUMENT_CATEGORY_MAP[documentType] || 'OTHER';
    const fileUrl = getFileUrl(req.file);

    const doc = await docService.createDocument({
      leadId,
      documentType,
      customDocumentName: documentType === 'OTHER' ? customDocumentName.trim() : null,
      category,
      fileUrl,
      originalFileName: req.file.originalname,
      storedFileName: req.file.filename,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      docNumber: docNumber || null,
      issueDate: issueDate ? new Date(issueDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      passengerIndex: passengerIndex !== undefined && passengerIndex !== '' ? parseInt(passengerIndex) : null,
      passengerLabel: passengerLabel || null,
      uploadedById: req.userId,
    });


    res.json({ success: true, message: 'Document uploaded successfully', data: doc });
  } catch (err) {
    console.error('Error uploading document:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/crm/documents/:id
export const getDocument = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const doc = await docService.findDocumentById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    console.error('Error fetching document:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/crm/documents/:id  (replace file)
export const replaceDocument = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await docService.findDocumentById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Document not found' });

    // Authorization: only uploader, admin, or manager can replace
    if (
      req.userRole === 'SALES_EXECUTIVE' &&
      existing.uploadedById !== req.userId
    ) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    let updateData = {};

    // If a new file is uploaded, replace it
    if (req.file) {
      // Delete old file using stored fileUrl
      if (process.env.VERCEL !== '1') {
        const relativePath = existing.fileUrl.replace(/^\//, '');
        const oldFilePath = path.join(process.cwd(), relativePath);
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
      }

      updateData.fileUrl = getFileUrl(req.file);
      updateData.originalFileName = req.file.originalname;
      updateData.storedFileName = req.file.filename;
      updateData.mimeType = req.file.mimetype;
      updateData.fileSize = req.file.size;
    }

    const { docNumber, issueDate, expiryDate, customDocumentName } = req.body;
    if (docNumber !== undefined) updateData.docNumber = docNumber;
    if (issueDate !== undefined) updateData.issueDate = issueDate ? new Date(issueDate) : null;
    if (expiryDate !== undefined) updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (customDocumentName !== undefined) updateData.customDocumentName = customDocumentName;

    const updated = await docService.updateDocumentById(id, updateData);
    res.json({ success: true, message: 'Document updated', data: updated });
  } catch (err) {
    console.error('Error replacing document:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/crm/documents/:id
export const deleteDocument = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await docService.findDocumentById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Document not found' });

    // Authorization check
    if (
      req.userRole === 'SALES_EXECUTIVE' &&
      existing.uploadedById !== req.userId
    ) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Delete physical file using stored fileUrl (relative to server root)
    if (process.env.VERCEL !== '1') {
      // fileUrl is like /uploads/customer-documents/filename.pdf
      const relativePath = existing.fileUrl.replace(/^\//, ''); // strip leading slash
      const filePath = path.join(process.cwd(), relativePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await docService.deleteDocumentById(id);
    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (err) {
    console.error('Error deleting document:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
