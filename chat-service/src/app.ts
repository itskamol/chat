import express, { Express } from "express";
import morgan from "morgan";
import messageRoutes from "./routes/messageRoutes";
import fileRoutes from "./routes/fileRoutes";
import { errorConverter, errorHandler } from "./middleware";

const app: Express = express();

// Create a custom Morgan format that uses our logger
app.use(morgan("combined", {
    stream: {
        write: (message) => {
            // Use your logger instance here if you want to log with winston
            // For now, just console.log to match previous behavior
            console.log(message.trim());
        },
    },
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Routes
// app.use(fileRoutes);
app.use(messageRoutes);

// Error handling middleware should be last
app.use(errorConverter);
app.use(errorHandler);

export default app;