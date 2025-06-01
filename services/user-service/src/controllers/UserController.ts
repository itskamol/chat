import { Request, Response } from "express";
import { User } from "../database";
import { logger } from "../utils";

export const getContacts = async (req: Request, res: Response): Promise<any> => {
    try {
        // Get the authenticated user's ID from the request object (set by 'protect' middleware)
        const authenticatedUserId = (req as any).user?.id;

        if (!authenticatedUserId) {
            // This case should ideally be caught by the protect middleware,
            // but as a safeguard:
            return res.status(401).json({ message: "User not authenticated" });
        }

        // Fetch all users except the currently authenticated user
        const users = await User.find({ _id: { $ne: authenticatedUserId } }).select("id name email");
        console.log("Fetched users:", users);
        return res.json({
            status: 200,
            message: "Contacts fetched successfully!",
            data: users.map(user => user.toObject()),
        });
    } catch (error: any) {
        logger.error("Error in getContacts:", error);
        return res.status(500).json({
            message: error.message || "Failed to fetch contacts",
        });
    }
};
