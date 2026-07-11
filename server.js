import express from "express"
import cors from "cors"
import compression from "compression"
import dns from "dns"
import dotenv from "dotenv"
import helmet from "helmet"
// Import custom middleware & configurations

// Import custom middleware & configurations
import { requestLogger } from "./middleware/logger.js"
import path from "path"
import { uploadsDir } from "./config/multer.js"
import { globalLimiter, sensitiveLimiter, xssSanitizer } from "./middleware/security.js"

// Import express routers
import uploadRouter from "./routes/upload.js"
import paymentRouter from "./routes/payment.js"
import packageRouter from "./routes/package.js"
import destinationRouter from "./routes/destination.js"
import bookingRouter from "./routes/booking.js"
import contactRouter from "./routes/contact.js"
import settingsRouter from "./routes/settings.js"
import authRouter from "./routes/auth.js"
import branchRouter from "./routes/branch.js"
import crmRouter from "./routes/crm.js"

// Resolve Node v17+ IPv6 DNS lookup issues on Windows & ISP DNS blocking for MongoDB Atlas
dns.setDefaultResultOrder("ipv4first")
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"])
} catch (error) {
  console.log("Could not set DNS servers:", error.message)
}

dotenv.config()

const app = express()
const port = process.env.PORT || 5000

// Initialize MongoDB connection removed

// Serve static files from uploads directory (local environment only)
if (process.env.VERCEL !== "1") {
  app.use("/uploads", express.static(uploadsDir))
  const assetsDir = path.join(process.cwd(), "../pratham-tours-frontend/public/assets")
  app.use("/assets", express.static(assetsDir))
}

// Global middlewares
app.use(requestLogger)

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "https://prathamtours.com",
  "https://www.prathamtours.com",
  "https://pratham-tours-client-smoky.vercel.app"
]

// Custom CORS middleware compatible with Express 5
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin) {
    const normalizedOrigin = origin.replace(/\/$/, "")
    const isAllowed =
      allowedOrigins.includes(normalizedOrigin) ||
      normalizedOrigin.endsWith(".vercel.app") ||
      normalizedOrigin.endsWith(".devtunnels.ms") ||
      normalizedOrigin.startsWith("https://pratham-tours-client") ||
      /^http:\/\/(192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|10\.)/.test(normalizedOrigin)

    if (isAllowed) {
      res.setHeader("Access-Control-Allow-Origin", origin)
      res.setHeader("Access-Control-Allow-Credentials", "true")
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
      res.setHeader(
        "Access-Control-Allow-Headers",
        req.headers["access-control-request-headers"] ||
        "Content-Type, Authorization, x-api-version, x-request-id"
      )

      // Intercept preflight OPTIONS request
      if (req.method === "OPTIONS") {
        return res.status(204).end()
      }
    } else {
      console.log(`[CORS] Rejected origin: ${origin}`)
    }
  }
  next()
})

app.use(compression({ level: 6 }))
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Apply security headers via Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'", "https:", "http:"],
        frameAncestors: ["'self'"],
      },
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xFrameOptions: { action: "sameorigin" },
  })
)

// Apply NoSQL query injection protection removed

// Apply XSS inputs sanitizer
app.use(xssSanitizer)

// Apply global rate limiter to all API routes
app.use("/api", globalLimiter)

// Apply sensitive rate limiters to transaction-heavy / email-sending endpoints
app.use("/api/contact", sensitiveLimiter)
app.use("/api/submit-booking-request", sensitiveLimiter)
app.use("/api/booking-requests", sensitiveLimiter)
app.use("/api/submit-custom-package", sensitiveLimiter)
app.use("/api/pay-now", sensitiveLimiter)
app.use("/api/payment-status-callback", sensitiveLimiter)

// Custom Cache control headers middleware
app.use((req, res, next) => {
  if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)) {
    res.setHeader("Cache-Control", "public, max-age=2592000, immutable")
  } else if (req.path.match(/\.(html)$/)) {
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate")
  } else if (req.path.startsWith("/api")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
  } else {
    res.setHeader("Cache-Control", "public, max-age=300")
  }

  next()
})

// Mount API routers
app.use("/api", authRouter)
app.use("/api/branches", branchRouter)
app.use("/api/crm", crmRouter)
app.use("/api", uploadRouter)
app.use("/api", paymentRouter)
app.use("/api", packageRouter)
app.use("/api", destinationRouter)
app.use("/api", bookingRouter)
app.use("/api", contactRouter)
app.use("/api", settingsRouter)

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Pratham Tours Backend API is running",
    status: "healthy",
    timestamp: new Date().toISOString(),
  })
})

// Centralized error handler to prevent info disclosure
app.use((err, req, res, next) => {
  console.error("[Fatal Error]:", err)

  const statusCode = err.status || err.statusCode || 500
  const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1"

  res.status(statusCode).json({
    success: false,
    message: isProduction ? "An internal server error occurred." : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  })
})

import prisma from "./config/prisma.js"

// Start server (local environment only)
if (process.env.VERCEL !== "1") {
  // Try connecting to the database first
  prisma.$connect()
    .then(() => {
      console.log("Database connected successfully to PostgreSQL via Prisma")
      app.listen(port, () => {
        console.log(`Server running on port ${port}`)
      })
    })
    .catch((err) => {
      console.error("Failed to connect to the database:", err)
    })
}

// Export for Vercel
export default app
// trigger restart
