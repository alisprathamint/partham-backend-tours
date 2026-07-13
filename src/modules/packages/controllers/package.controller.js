import { PDFParse } from 'pdf-parse';
import { GoogleGenAI } from '@google/genai';
import { transporter } from '../../../config/email.js';
import prisma from '../../../config/prisma.js'; // Needed for other relation fetches
import {
  generateAdminCustomPackageEmailHTML,
  generateCustomerCustomPackageEmailHTML
} from '../../../utils/emailTemplates.js';
import * as packageService from '../services/package.service.js';

const decodeHtmlEntities = (str) => {
  if (!str) return str;
  let decoded = str;
  for (let i = 0; i < 2; i++) {
    decoded = decoded
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');
  }
  return decoded;
};

const generateSlug = (text) => {
  if (!text) return "";
  return decodeHtmlEntities(text)
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const sendCustomPackageNotification = async (to, subject, requestData) => {
  try {
    const mailOptions = {
      from: `"Pratham Tours Travel" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: generateAdminCustomPackageEmailHTML(requestData),
    };

    await transporter.sendMail(mailOptions);
    console.log("Admin notification email sent successfully");
    return { success: true };
  } catch (error) {
    console.error("Error sending admin notification email:", error);
    return { success: false, error: error.message };
  }
};

const sendCustomPackageConfirmation = async (to, subject, requestData) => {
  try {
    const formattedActivities = Array.isArray(requestData.activities)
      ? requestData.activities.join(", ")
      : requestData.activities || "None specified";

    const mailOptions = {
      from: `"Pratham Tours Travel" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: generateCustomerCustomPackageEmailHTML(requestData, formattedActivities),
    };

    await transporter.sendMail(mailOptions);
    console.log("Customer confirmation email sent successfully");
    return { success: true };
  } catch (error) {
    console.error("Error sending customer confirmation email:", error);
    return { success: false, error: error.message };
  }
};

const getPrimaryPlace = (location) => {
  if (!location) return "";
  const normalized = location.toLowerCase();
  
  const knownPlaces = [
    "goa", "manali", "shimla", "daman", "mount abu", "somnath", "vietnam", "bali", 
    "pushkar", "thailand", "udaipur", "vrindavan", "darjeeling", "gangtok", "singapore", 
    "uttarakhand", "dubai", "hong kong", "oman", "varanasi", "ujjain", "matheran", 
    "saputara", "dwarka", "silvassa", "dudhani", "char dham"
  ];

  for (const place of knownPlaces) {
    if (normalized.includes(place)) {
      return place;
    }
  }

  return normalized.split(",")[0].trim();
};

export const getPackages = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit);
    const featured = req.query.featured === "true";

    let packages = [];
    if (featured) {
      const allFeatured = await packageService.findManyFeaturedPackages();
      
      const selected = [];
      const seenPlaces = new Set();
      
      for (const pkg of allFeatured) {
        const place = getPrimaryPlace(pkg.location || pkg.name);
        if (!seenPlaces.has(place)) {
          selected.push(pkg);
          seenPlaces.add(place);
        }
        if (limit && !isNaN(limit) && selected.length >= limit) {
          break;
        }
      }
      
      if (limit && !isNaN(limit) && selected.length < limit) {
        for (const pkg of allFeatured) {
          if (!selected.some(s => s.id.toString() === pkg.id.toString())) {
            selected.push(pkg);
          }
          if (selected.length >= limit) {
            break;
          }
        }
      }
      
      packages = selected;
      
      if (limit && !isNaN(limit) && packages.length < limit) {
        const additionalNeeded = limit - packages.length;
        const additionalPackages = await packageService.findManyPackages({ 
          where: { featured: false },
          take: additionalNeeded
        });
        packages = packages.concat(additionalPackages);
      } else if (limit && !isNaN(limit)) {
        packages = packages.slice(0, limit);
      }
    } else {
      let packagesQuery = { where: {} };
      if (limit && !isNaN(limit)) {
        packagesQuery.take = limit;
      }
      packages = await packageService.findManyPackages(packagesQuery);
    }
    
    const allPackages = await packageService.findManyPackages({ select: { category: true } });
    const categories = [...new Set(allPackages.map((pkg) => pkg.category).filter(Boolean))];

    const destinations = await prisma.destination.findMany({});

    res.json({
      success: true,
      packages: packages,
      destinations: destinations,
      categories: categories,
    });
  } catch (error) {
    console.error("Error fetching packages:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch packages",
      error: error.message,
    });
  }
};

export const getPackageByIdentifier = async (req, res) => {
  try {
    const { identifier } = req.params;
    let package_;

    const packageId = Number.parseInt(identifier);
    if (!isNaN(packageId)) {
      package_ = await packageService.findPackageById(packageId);
    }

    if (!package_) {
      const allPackages = await packageService.findManyPackages();
      package_ = allPackages.find(
        (p) => generateSlug(p.name) === identifier
      );
    }

    if (!package_) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    res.json({
      success: true,
      package: package_,
    });
  } catch (error) {
    console.error("Error fetching package:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch package",
      error: error.message,
    });
  }
};

export const createPackage = async (req, res) => {
  try {
    const data = req.body;
    
    const newPackage = await packageService.createPackage({
      name: data.name,
      location: data.location,
      category: data.category || null,
      price: data.price ? String(data.price) : "",
      duration: data.duration || "",
      image: data.image || null,
      galleryImages: Array.isArray(data.galleryImages) ? data.galleryImages : [],
      description: data.description || null,
      featured: data.featured || false,
      highlights: Array.isArray(data.highlights) ? data.highlights : [],
      inclusions: Array.isArray(data.inclusions) ? data.inclusions : [],
      exclusions: Array.isArray(data.exclusions) ? data.exclusions : [],
      itinerary: data.itinerary || [],
    });

    res.json({
      success: true,
      message: "Package created successfully",
      package: newPackage
    });
  } catch (error) {
    console.error("Error creating package:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create package",
      error: error.message,
    });
  }
};

export const updatePackage = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "Invalid package ID" });
    }

    const data = req.body;

    const existingPackage = await packageService.findPackageById(id);
    if (!existingPackage) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }

    const decodeHtml = (str) => {
      if (!str) return str;
      return str
        .replace(/&#x2F;/gi, '/')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'");
    };

    const rawImage = data.image && data.image.trim() !== '' ? data.image : existingPackage.image;
    const imageToSave = decodeHtml(rawImage);

    const updatedPackage = await packageService.updatePackageById(id, {
      name: data.name,
      location: data.location,
      category: data.category || null,
      price: data.price ? String(data.price) : "",
      duration: data.duration || "",
      image: imageToSave,
      galleryImages: Array.isArray(data.galleryImages) ? data.galleryImages : existingPackage.galleryImages,
      description: data.description || null,
      featured: typeof data.featured === 'boolean' ? data.featured : existingPackage.featured,
      highlights: Array.isArray(data.highlights) ? data.highlights : existingPackage.highlights,
      inclusions: Array.isArray(data.inclusions) ? data.inclusions : existingPackage.inclusions,
      exclusions: Array.isArray(data.exclusions) ? data.exclusions : existingPackage.exclusions,
      itinerary: data.itinerary || existingPackage.itinerary,
    });

    res.json({
      success: true,
      message: "Package updated successfully",
      package: updatedPackage
    });
  } catch (error) {
    console.error("Error updating package:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update package",
      error: error.message,
    });
  }
};

export const submitCustomPackage = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      origin,
      destination,
      startDate,
      duration,
      budget,
      travelers,
      activities,
      accommodation,
      transportation,
      specialRequests,
    } = req.body;

    if (!fullName || !email || !phone || !origin || !destination) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const requestId = `CP_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    await packageService.createCustomPackageRequest({
      full_name: fullName,
      email: email,
      phone: phone,
      departure_location: origin,
      destination: destination,
      start_date: new Date(startDate),
      duration: duration,
      budget: budget,
      travelers: Number.parseInt(travelers) || 1,
      activities: Array.isArray(activities) && activities.length > 0 ? activities.join(", ") : activities || "",
      accommodation: accommodation || "standard",
      transportation: transportation || "public",
      special_requests: specialRequests || "",
      status: "pending",
      request_date: new Date(),
    });

    try {
      await sendCustomPackageNotification(process.env.EMAIL_USER, "New Custom Package Request", {
        fullName, email, phone, origin, destination, startDate, duration, budget, travelers, activities, accommodation, transportation, specialRequests, requestId
      });
    } catch (emailError) {
      console.error("Error sending admin notification email:", emailError);
    }

    try {
      await sendCustomPackageConfirmation(email, "Your Custom Travel Package Request", {
        fullName, email, phone, origin, destination, startDate, duration, budget, travelers, activities, accommodation, transportation, specialRequests, requestId
      });
    } catch (emailError) {
      console.error("Error sending confirmation email:", emailError);
    }

    res.json({
      success: true,
      message: "Custom package request submitted successfully",
      requestId,
    });
  } catch (error) {
    console.error("Error submitting custom package request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit custom package request",
      error: error.message,
    });
  }
};

export const getCustomPackageRequests = async (req, res) => {
  try {
    let query = {
      orderBy: { request_date: "desc" }
    };

    if (req.userRole === 'SALES' && req.userRegion && req.userRegion !== 'ALL') {
      query.where = {
        departure_location: {
          contains: req.userRegion,
          mode: 'insensitive'
        }
      };
    }

    const requests = await packageService.findCustomPackageRequests(query);
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error("Error fetching custom package requests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch custom package requests",
      error: error.message,
    });
  }
};

export const updateCustomPackageRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    await packageService.updateCustomPackageRequestById(parseInt(id), status);

    res.json({
      success: true,
      message: "Custom package request updated successfully",
    });
  } catch (error) {
    console.error("Error updating custom package request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update custom package request",
      error: error.message,
    });
  }
};

const generateContentWithRetry = async (ai, prompt, models = ['gemini-3.5-flash', 'gemini-flash-latest'], maxRetriesPerModel = 2) => {
  let lastError;
  for (const model of models) {
    let delay = 1000;
    for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
      try {
        console.log(`[Gemini PDF Extraction] Attempting to generate content using model: ${model} (Attempt ${attempt}/${maxRetriesPerModel})`);
        const response = await ai.models.generateContent({
          model: model,
          contents: prompt,
        });
        return response;
      } catch (error) {
        lastError = error;
        const isTransient = error.status === 503 || error.status === 429 || 
                            (error.message && (error.message.includes('503') || 
                                               error.message.includes('429') || 
                                               error.message.includes('UNAVAILABLE') || 
                                               error.message.includes('high demand')));
        
        console.warn(`[Gemini PDF Extraction] Error generating content with model ${model} on attempt ${attempt}:`, error.message || error);
        
        if (isTransient && attempt < maxRetriesPerModel) {
          console.log(`[Gemini PDF Extraction] Transient error. Retrying model ${model} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2.5; // exponential backoff with factor 2.5
        } else {
          break;
        }
      }
    }
  }
  throw lastError;
};

export const extractFromPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No PDF file uploaded" });
    }

    const magicBytes = req.file.buffer.subarray(0, 5).toString('utf8');
    if (magicBytes !== '%PDF-') {
      return res.status(400).json({ success: false, message: "Invalid file format. Only genuine PDF files are allowed." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ success: false, message: "GEMINI_API_KEY is not configured in backend .env file" });
    }

    const parser = new PDFParse({ data: req.file.buffer });
    const pdfData = await parser.getText();
    const textContent = pdfData.text;

    if (!textContent || textContent.trim() === '') {
      return res.status(400).json({ success: false, message: "Could not extract text from PDF" });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `
You are a travel package data extraction assistant.
Extract the travel package details from the following raw text obtained from a PDF brochure.
Format the output EXACTLY as a valid JSON object matching this structure:
{
  "name": "Package Name (string)",
  "location": "Primary destination/location (string)",
  "category": "Category like 'International', 'Domestic', 'Honeymoon', 'Adventure', or empty (string)",
  "price": "Base price as a number/string without currency symbol (string)",
  "duration": "e.g., '5 Days, 4 Nights' (string)",
  "description": "A detailed overview or summary of the trip (string)",
  "highlights": ["highlight 1", "highlight 2"],
  "inclusions": ["inclusion 1", "inclusion 2"],
  "exclusions": ["exclusion 1", "exclusion 2"],
  "itinerary": [
    {
      "day": 1,
      "title": "Day 1 Title",
      "activities": ["Activity 1", "Activity 2"]
    }
  ]
}

Raw PDF Text:
${textContent.substring(0, 30000)}

Return ONLY the raw JSON object. Do not include markdown formatting like \`\`\`json.
`;

    const response = await generateContentWithRetry(ai, prompt);

    let jsonString = response.text;
    jsonString = jsonString.replace(/```json/gi, '').replace(/```/g, '').trim();

    const parsedData = JSON.parse(jsonString);

    res.json({
      success: true,
      data: parsedData
    });
  } catch (error) {
    console.error("Error extracting from PDF:", error);
    res.status(500).json({
      success: false,
      message: "Failed to extract package details from PDF",
      error: error.message
    });
  }
};
