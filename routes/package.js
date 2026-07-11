import express from "express"
import prisma from "../config/prisma.js"
import { transporter } from "../config/email.js"
import { verifyToken, isAdmin } from "../middleware/auth.js"
import {
  generateAdminCustomPackageEmailHTML,
  generateCustomerCustomPackageEmailHTML,
} from "../utils/emailTemplates.js"
import multer from "multer"
import { PDFParse } from "pdf-parse"
import { GoogleGenAI } from "@google/genai"

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
})

const router = express.Router()

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


// Helper to send notification email to admin
const sendCustomPackageNotification = async (to, subject, requestData) => {
  try {
    const mailOptions = {
      from: `"Pratham Tours Travel" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: generateAdminCustomPackageEmailHTML(requestData),
    }

    await transporter.sendMail(mailOptions)
    console.log("Admin notification email sent successfully")
    return { success: true }
  } catch (error) {
    console.error("Error sending admin notification email:", error)
    return { success: false, error: error.message }
  }
}

// Helper to send confirmation email to customer
const sendCustomPackageConfirmation = async (to, subject, requestData) => {
  try {
    const formattedActivities = Array.isArray(requestData.activities)
      ? requestData.activities.join(", ")
      : requestData.activities || "None specified"

    const mailOptions = {
      from: `"Pratham Tours Travel" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: generateCustomerCustomPackageEmailHTML(requestData, formattedActivities),
    }

    await transporter.sendMail(mailOptions)
    console.log("Customer confirmation email sent successfully")
    return { success: true }
  } catch (error) {
    console.error("Error sending customer confirmation email:", error)
    return { success: false, error: error.message }
  }
}

// Helper to extract primary place from location or package name for home page unique selection
const getPrimaryPlace = (location) => {
  if (!location) return ""
  const normalized = location.toLowerCase()
  
  const knownPlaces = [
    "goa", "manali", "shimla", "daman", "mount abu", "somnath", "vietnam", "bali", 
    "pushkar", "thailand", "udaipur", "vrindavan", "darjeeling", "gangtok", "singapore", 
    "uttarakhand", "dubai", "hong kong", "oman", "varanasi", "ujjain", "matheran", 
    "saputara", "dwarka", "silvassa", "dudhani", "char dham"
  ]

  for (const place of knownPlaces) {
    if (normalized.includes(place)) {
      return place
    }
  }

  return normalized.split(",")[0].trim()
}

// Get packages, destinations, and categories
router.get("/packages", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit)
    const featured = req.query.featured === "true"

    let packages = []
    if (featured) {
      // First fetch featured packages
      const allFeatured = await prisma.package.findMany({ where: { featured: true } })
      
      // Select packages from unique places
      const selected = []
      const seenPlaces = new Set()
      
      for (const pkg of allFeatured) {
        const place = getPrimaryPlace(pkg.location || pkg.name)
        if (!seenPlaces.has(place)) {
          selected.push(pkg)
          seenPlaces.add(place)
        }
        if (limit && !isNaN(limit) && selected.length >= limit) {
          break
        }
      }
      
      // If we couldn't satisfy the limit with unique places, backfill with remaining featured packages
      if (limit && !isNaN(limit) && selected.length < limit) {
        for (const pkg of allFeatured) {
          if (!selected.some(s => s.id.toString() === pkg.id.toString())) {
            selected.push(pkg)
          }
          if (selected.length >= limit) {
            break
          }
        }
      }
      
      packages = selected
      
      // If we have a limit and need more packages to satisfy the limit, backfill with non-featured
      if (limit && !isNaN(limit) && packages.length < limit) {
        const additionalNeeded = limit - packages.length
        const additionalPackages = await prisma.package.findMany({ 
          where: { featured: false },
          take: additionalNeeded
        })
        packages = packages.concat(additionalPackages)
      } else if (limit && !isNaN(limit)) {
        packages = packages.slice(0, limit)
      }
    } else {
      let packagesQuery = { where: {} }
      if (limit && !isNaN(limit)) {
        packagesQuery.take = limit
      }
      packages = await prisma.package.findMany(packagesQuery)
    }
    
    // Still fetch all categories and destinations so client-side filters work
    const allPackages = await prisma.package.findMany({ select: { category: true } })
    const categories = [...new Set(allPackages.map((pkg) => pkg.category).filter(Boolean))]

    const destinations = await prisma.destination.findMany({})

    res.json({
      success: true,
      packages: packages,
      destinations: destinations,
      categories: categories,
    })
  } catch (error) {
    console.error("Error fetching packages:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch packages",
      error: error.message,
    })
  }
})

// Get a single package by ID or slug
router.get("/packages/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params
    let package_

    // Try to find by ID first
    const packageId = Number.parseInt(identifier)
    if (!isNaN(packageId)) {
      package_ = await prisma.package.findUnique({ where: { id: packageId } })
    }

    if (!package_) {
      const allPackages = await prisma.package.findMany()
      package_ = allPackages.find(
        (p) => generateSlug(p.name) === identifier
      )
    }

    if (!package_) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      })
    }

    res.json({
      success: true,
      package: package_,
    })
  } catch (error) {
    console.error("Error fetching package:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch package",
      error: error.message,
    })
  }
})

// Create a new package
router.post("/packages", [verifyToken, isAdmin], async (req, res) => {
  try {
    const data = req.body;
    
    // Convert itinerary to a format Prisma can store as JSON, if provided
    const newPackage = await prisma.package.create({
      data: {
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
      }
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
});

// Update an existing package
router.put("/packages/:id", [verifyToken, isAdmin], async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "Invalid package ID" });
    }

    const data = req.body;

    // Fetch current package to preserve image if not changed
    const existingPackage = await prisma.package.findUnique({ where: { id } });
    if (!existingPackage) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }

    // Decode any HTML-encoded characters in the image URL
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

    // Use new image only if explicitly provided (non-empty), otherwise keep existing
    const rawImage = data.image && data.image.trim() !== '' ? data.image : existingPackage.image;
    const imageToSave = decodeHtml(rawImage);


    const updatedPackage = await prisma.package.update({
      where: { id },
      data: {
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
      }
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
});


// Submit custom package request
router.post("/submit-custom-package", async (req, res) => {
  try {
    console.log("[v0] Custom package request received:", req.body)

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
    } = req.body

    // Validate required fields
    if (!fullName || !email || !phone || !origin || !destination) {
      console.error("[v0] Missing required fields in custom package request")
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      })
    }

    const requestId = `CP_${Date.now()}_${Math.floor(Math.random() * 1000)}`

    const newCustomPackageRequest = await prisma.customPackageRequest.create({
      data: {
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
      }
    })
    console.log(`[v0] Custom package request saved with ID: ${requestId} and departure_location: ${origin}`)

    // Send notification email to admin
    try {
      await sendCustomPackageNotification(process.env.EMAIL_USER, "New Custom Package Request", {
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
        requestId,
      })
    } catch (emailError) {
      console.error("Error sending admin notification email:", emailError)
    }

    // Send confirmation email to user
    try {
      await sendCustomPackageConfirmation(email, "Your Custom Travel Package Request", {
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
        requestId,
      })
    } catch (emailError) {
      console.error("Error sending confirmation email:", emailError)
    }

    res.json({
      success: true,
      message: "Custom package request submitted successfully",
      requestId,
    })
  } catch (error) {
    console.error("Error submitting custom package request:", error)
    res.status(500).json({
      success: false,
      message: "Failed to submit custom package request",
      error: error.message,
    })
  }
})

// Fetch all custom package requests
router.get("/custom-package-requests", verifyToken, async (req, res) => {
  try {
    let query = {
      orderBy: { request_date: "desc" }
    };

    // If user is SALES and region is not ALL, filter by departure_location
    if (req.userRole === 'SALES' && req.userRegion && req.userRegion !== 'ALL') {
      // Use case-insensitive search for region in departure_location
      query.where = {
        departure_location: {
          contains: req.userRegion,
          mode: 'insensitive'
        }
      };
    }

    const requests = await prisma.customPackageRequest.findMany(query)

    res.json({
      success: true,
      data: requests,
    })
  } catch (error) {
    console.error("Error fetching custom package requests:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch custom package requests",
      error: error.message,
    })
  }
})

// Update custom package request status
router.put("/custom-package-requests/:id", [verifyToken, isAdmin], async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      })
    }

    const updatedRequest = await prisma.customPackageRequest.update({
      where: { id: parseInt(id) },
      data: { status }
    })

    if (!updatedRequest) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      })
    }

    res.json({
      success: true,
      message: "Custom package request updated successfully",
    })
  } catch (error) {
    console.error("Error updating custom package request:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update custom package request",
      error: error.message,
    })
  }
})

// Extract package details from PDF
router.post("/packages/extract-from-pdf", [verifyToken, isAdmin, upload.single("file")], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No PDF file uploaded" })
    }

    // Security Check: Verify Magic Bytes (Must start with %PDF-)
    const magicBytes = req.file.buffer.subarray(0, 5).toString('utf8')
    if (magicBytes !== '%PDF-') {
      return res.status(400).json({ success: false, message: "Invalid file format. Only genuine PDF files are allowed." })
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ success: false, message: "GEMINI_API_KEY is not configured in backend .env file" })
    }

    // 1. Parse PDF
    const parser = new PDFParse({ data: req.file.buffer })
    const pdfData = await parser.getText()
    const textContent = pdfData.text

    if (!textContent || textContent.trim() === '') {
      return res.status(400).json({ success: false, message: "Could not extract text from PDF" })
    }

    // 2. Initialize Gemini
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    // 3. Prompt for Gemini
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
`

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
    })

    let jsonString = response.text
    // Clean up markdown code block if present
    jsonString = jsonString.replace(/```json/gi, '').replace(/```/g, '').trim()

    const parsedData = JSON.parse(jsonString)

    res.json({
      success: true,
      data: parsedData
    })

  } catch (error) {
    console.error("Error extracting from PDF:", error)
    res.status(500).json({
      success: false,
      message: "Failed to extract package details from PDF",
      error: error.message
    })
  }
})

export default router
