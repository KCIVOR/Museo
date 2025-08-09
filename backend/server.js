import express from "express";
import helmet from "helmet";
import morgan from "morgan"
import cors from "cors";
import dotenv from "dotenv";
import { v4 as uuidv4 } from 'uuid';
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
dotenv.config();

const app = express()
const PORT = process.env.PORT; // takes the port from .env file

console.log(PORT)

app.use(helmet());//security middleware for protecting the app by setting various HTTP headers
app.use(morgan("dev")); // log the req to console
app.use(express.json());
app.use(cors());


app.use("/api/users", userRoutes) //papunta sa routes(userRoutes.js)
app.use("/api/auth", authRoutes);// papunta sa authRoutes

app.listen(PORT,()=>{
    console.log("Server is running on port", PORT)
})