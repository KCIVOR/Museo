import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import homepageRoutes from "./routes/homepageRoutes.js";
import artistRoutes from "./routes/artistRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import testNotificationRoutes from "./routes/testNotification.js";
import requestRoutes from "./routes/requestRoutes.js"
import messageRoutes from "./routes/messageRoutes.js"
import galleryRoutes from "./routes/galleryRoutes.js"
import visitBookingRoutes from "./routes/visitBookingRoutes.js"
import marketplaceRoutes from "./routes/marketplaceRoutes.js"
import payoutRoutes from "./routes/payoutRoutes.js"

import webhookRoutes from "./routes/webhookRoutes.js"
import cookieParser from "cookie-parser";
import { simpleRotation, promotePopularOldPosts, generateWeeklyTopArts } from './controllers/galleryController.js';
import { cancelExpiredOrders } from './controllers/orderCleanupController.js';
import payoutService from './services/payoutService.js';
import { authMiddleware } from "./middleware/auth.js";
import { Server } from "socket.io"
import http, { request } from "http";
import cron from "node-cron";
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import initializeRealtimeSync from './services/realtimeSync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = process.env.ALLOWED_ORIGINS || "http://localhost:5173";



// ✅ 1. CORS first
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// ✅ 2. Cookie parser next
app.use(cookieParser());

// ✅ 3. Security / logging / body parsers
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ✅ 4. Static files
app.use("/uploads", express.static("uploads"));

// ✅ 5. Routes
app.use("/api/users", authMiddleware, userRoutes);
//homepage
app.use("/api/homepage", authMiddleware, homepageRoutes);
//artist
app.use("/api/artist", authMiddleware, artistRoutes);

//profile
app.use("/api/profile", authMiddleware, profileRoutes);

//event
app.use("/api/event", authMiddleware, eventRoutes);

// Auth routes
app.use("/api/auth", authRoutes);

// notification list (public; add auth if needed)
app.use("/api/notification", authMiddleware, notificationRoutes);

// Test notification route (for debugging)
app.use("/api/test-notification", authMiddleware, testNotificationRoutes);

//request routes
app.use("/api/request", authMiddleware, requestRoutes)

app.use("/api/message", authMiddleware, messageRoutes)

app.use("/api/gallery", authMiddleware, galleryRoutes)

// Visit booking routes (public POST, protected GET/PUT/DELETE)
app.use("/api/visit-bookings", visitBookingRoutes)

// Marketplace routes
app.use("/api/marketplace", authMiddleware, marketplaceRoutes)

// Payout routes
app.use("/api/payouts", authMiddleware, payoutRoutes)

// Webhook routes (NO authentication - called by external services)
app.use("/api/webhooks", webhookRoutes)


// Create HTTP + Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true },
});
// Make io available to controllers
app.set("io", io);

// On connection, join a global room so we can broadcast easily
io.on("connection", (socket) => {
  try {
    socket.join("all-users");
    console.log("[socket] connected:", socket.id, "joined room all-users");

    // Join a per-user room so we can target events to a specific user
    socket.on("join", (userId) => {
      try {
        if (!userId) return;
        socket.join(`user_${userId}`); // Changed from user:${userId} to user_${userId} for consistency
        console.log(`[socket] ${socket.id} joined user room user_${userId}`);
      } catch (e) {
        console.error("socket join error:", e);
      }
    });
  } catch (e) {
    console.error("socket connection error:", e);
  }
});

// 🔄 Initialize Supabase Realtime sync
// This listens to database changes and emits Socket.IO events
const cleanupRealtime = initializeRealtimeSync(io);

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, cleaning up...');
  cleanupRealtime();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, cleaning up...');
  cleanupRealtime();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});



server.listen(PORT, () => {
  console.log("Server is running on port", PORT);
  
  // Counter for re-featuring checks
  let cronRunCount = 0;
  
  // Daily featured artwork maintenance at midnight (Philippine Time)
  cron.schedule('0 0 * * *', async () => {
    console.log(' Running daily featured artwork maintenance...');
    
    try {
      // Run rotation first to manage current featured artworks
      console.log(' Step 1: Running artwork rotation...');
      await simpleRotation();
      
      // Run re-featuring to promote popular old posts
      console.log(' Step 2: Running popular old posts re-featuring...');
      await promotePopularOldPosts();
      
      console.log(' Daily featured artwork maintenance completed successfully');
      
    } catch (error) {
      console.error(' Daily maintenance failed:', error);
    }
  }, {
    timezone: "Asia/Manila"
  });

  // Top Arts of the Week - Every Sunday at 11:59 PM (Philippine Time)
  cron.schedule('59 23 * * 0', async () => {
    console.log(' Running weekly Top Arts generation (Sunday 11:59 PM PH Time)...');
    
    try {
      await generateWeeklyTopArts();
      console.log('✅ Weekly Top Arts generation completed successfully');
    } catch (error) {
      console.error('❌ Weekly Top Arts generation failed:', error);
    }
  }, {
    timezone: "Asia/Manila"
  });

  // Cancel expired orders - Every hour
  cron.schedule('0 * * * *', async () => {
    console.log('🛒 Running expired order cleanup...');
    
    try {
      await cancelExpiredOrders();
      console.log('✅ Expired order cleanup completed');
    } catch (error) {
      console.error('❌ Order cleanup failed:', error);
    }
  });

  // Process ready payouts - Daily at 9:00 AM (Philippine Time)
  cron.schedule('0 9 * * *', async () => {
    console.log('💰 Running daily payout processing...');
    
    try {
      const result = await payoutService.processReadyPayouts();
      console.log(`✅ Processed ${result.processed} payouts`);
      if (result.errors && result.errors.length > 0) {
        console.log('⚠️ Errors:', result.errors);
      }
    } catch (error) {
      console.error('❌ Payout processing failed:', error);
    }
  }, {
    timezone: "Asia/Manila"
  });

  console.log('📅 Cron jobs scheduled:');
  console.log('   🌅 Featured artwork maintenance: Daily at 12:00 AM (PH Time)');
  console.log('   🔄 Artwork rotation & re-featuring: Daily at midnight (PH Time)');
  console.log('   🛒 Expired order cleanup: Every hour');
  console.log('   🏆 Top Arts generation: Every Sunday 11:59 PM (PH Time)');
  console.log('   💰 Payout processing: Daily at 9:00 AM (PH Time)');
  
});
