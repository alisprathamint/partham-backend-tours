import express from "express"
import prisma from "../config/prisma.js"
import { transporter } from "../config/email.js"
import {
  generateAdminCustomPackageEmailHTML,
  generateCustomerCustomPackageEmailHTML,
} from "../utils/emailTemplates.js"

const router = express.Router()

const generateSlug = (text) => {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric characters with a hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading and trailing hyphens
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
router.get("/custom-package-requests", async (req, res) => {
  try {
    const requests = await prisma.customPackageRequest.findMany({
      orderBy: {
        request_date: "desc"
      }
    })

    res.json({
      success: true,
      requests: requests,
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
router.put("/custom-package-requests/:id", async (req, res) => {
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

export default router
