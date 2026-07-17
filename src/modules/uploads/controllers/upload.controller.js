import fs from 'fs';
import path from 'path';
import { uploadsDir } from '../../../config/multer.js';

const getRelativeUploadPath = (file) => {
  if (!file || !file.destination) return "";
  const relative = path.relative(uploadsDir, file.destination);
  return relative ? relative.replace(/\\/g, "/") : "";
};

export const uploadPackageFiles = async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    const uploadedFiles = {};
    const fileDetails = {};

    const fieldNames = Object.keys(req.files);
    for (const fieldName of fieldNames) {
      const files = req.files[fieldName];
      if (files && files.length > 0) {
        const file = files[0];
        
        const relativePath = getRelativeUploadPath(file);
        const fileUrl = process.env.VERCEL === "1" 
          ? `/tmp/${file.filename}` 
          : `/uploads/${relativePath ? relativePath + "/" : ""}${file.filename}`;

        uploadedFiles[fieldName] = fileUrl;
        fileDetails[fieldName] = {
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          url: fileUrl,
        };
      }
    }

    res.json({
      success: true,
      message: `${Object.keys(uploadedFiles).length} files uploaded successfully`,
      files: uploadedFiles,
      details: fileDetails,
    });
  } catch (error) {
    console.error("Error uploading package files:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload files",
      error: error.message,
    });
  }
};

export const uploadSingleFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const relativePath = getRelativeUploadPath(req.file);
    const fileUrl = process.env.VERCEL === "1"
      ? `/tmp/${req.file.filename}`
      : `/uploads/${relativePath ? relativePath + "/" : ""}${req.file.filename}`;

    res.json({
      success: true,
      message: "File uploaded successfully",
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
      },
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload file",
      error: error.message,
    });
  }
};

export const uploadMultipleFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    const uploadedFiles = [];
    for (const file of req.files) {
      const relativePath = getRelativeUploadPath(file);
      const fileUrl = process.env.VERCEL === "1"
        ? `/tmp/${file.filename}`
        : `/uploads/${relativePath ? relativePath + "/" : ""}${file.filename}`;
      
      uploadedFiles.push({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: fileUrl,
      });
    }

    res.json({
      success: true,
      message: `${uploadedFiles.length} files uploaded successfully`,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error("Error uploading files:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload files",
      error: error.message,
    });
  }
};

export const getFiles = (req, res) => {
  try {
    if (process.env.VERCEL === "1") {
      return res.json({
        success: true,
        files: [],
        message: "File listing not available on Vercel"
      });
    }

    const { type } = req.query;

    const targetDir = uploadsDir;
    const urlPrefix = "/uploads";

    const isImageFilter = type === "images";
    const isPdfFilter = type === "pdfs";

    const files = fs
      .readdirSync(targetDir)
      .filter((file) => {
        const filePath = path.join(targetDir, file);
        if (!fs.statSync(filePath).isFile()) return false;
        if (isImageFilter) {
          return /\.(jpg|jpeg|png|gif|webp)$/i.test(file);
        }
        if (isPdfFilter) {
          return /\.pdf$/i.test(file);
        }
        return true;
      })
      .map((file) => {
        const filePath = path.join(targetDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          url: `${urlPrefix}/${file}`,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      files: files,
    });
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch files",
      error: error.message,
    });
  }
};

export const deleteFile = (req, res) => {
  try {
    if (process.env.VERCEL === "1") {
      return res.json({
        success: true,
        message: "File deletion not supported on Vercel"
      });
    }

    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete file",
      error: error.message,
    });
  }
};
