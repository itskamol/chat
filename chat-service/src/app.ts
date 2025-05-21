import express, { Express } from "express";
import morgan from "morgan";
import userRouter from "./routes/messageRoutes";
import { errorConverter, errorHandler } from "./middleware";
import logger from "@shared/utils/logger";

const app: Express = express();

// Create a custom Morgan format that uses our logger
app.use(morgan("combined", {
    stream: {
        write: (message) => {
            logger.http(message.trim());
        },
    },
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP" });
});

app.use(userRouter);
app.use(errorConverter);
app.use(errorHandler);

export default app;