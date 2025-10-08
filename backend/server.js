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
import requestRoutes from "./routes/requestRoutes.js"

import cookieParser from "cookie-parser";
import { authMiddleware } from "./middleware/auth.js";
import { Server } from "socket.io"
import http, { request } from "http";


dotenv.config();

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
app.use("/api/notification",authMiddleware, notificationRoutes);

//request routes
app.use("/api/request", authMiddleware,requestRoutes)


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
  } catch (e) {
    console.error("socket connection error:", e);
  }
});

server.listen(PORT, () => {
  console.log("Server is running on port", PORT);
});
