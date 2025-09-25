import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import homepageRoutes from "./routes/homepageRoutes.js";
import cookieParser from "cookie-parser";
import { authMiddleware } from "./middleware/auth.js";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ 1. CORS first
app.use(cors({
  origin: "http://localhost:5173",
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
app.use("/api/homepage", authMiddleware, homepageRoutes);
app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
  console.log("Server is running on port", PORT);
});
