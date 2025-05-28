import mongoose from "mongoose";
import { env } from "../config/env";

export const connectDB = async () => {
    try {
        console.info("Connecting to database..." + env.MONGO_URI);
        
        await mongoose.connect(env.MONGO_URI!);
        console.info("Database connected");
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};