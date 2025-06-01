import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../database";
import { ApiError, encryptPassword, isPasswordMatch, logger } from "../utils";
import config from "../config/config";
import { IUser } from "../database";

const jwtSecret = config.JWT_SECRET as string;

export const register = async (req: Request, res: Response): Promise<any> => {
    try {
        const { name, email, password } = req.body;
        const userExists = await User.findOne({ email });
        if (userExists) {
            throw new ApiError(400, "User already exists!");
        }

        const user = await User.create({
            name,
            email,
            password: await encryptPassword(password),
        });

        const userData = {
            id: user._id,
            name: user.name,
            email: user.email,
        };

        return res.json({
            status: 200,
            message: "User registered successfully!",
            data: userData,
        });
    } catch (error: any) {
        console.error("Error in register:", error);
        return res.json({
            status: 500,
            message: error.message,
        });
    }
};

// Updated to no longer set cookies directly
const createToken = async (user: IUser): Promise<string> => {
    const { name, email, id } = user;
    const token = jwt.sign({ name, email, id }, jwtSecret, {
        expiresIn: "1d", // Or your desired expiration
    });
    // Removed cookie setting logic:
    // if (config.env === "production") cookieOptions.secure = true;
    // res.cookie("jwt", token, cookieOptions);
    return token;
};

export const login = async (req: Request, res: Response): Promise<any> => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }).select("+password");
        if (
            !user ||
            !(await isPasswordMatch(password, user.password as string))
        ) {
            throw new ApiError(400, "Incorrect email or password");
        }

        const token = await createToken(user!); // Changed from createSendToken

        return res.json({
            status: 200, // Consistent status code, should be number
            message: "User logged in successfully!",
            token,
        });
    } catch (error: any) {
        console.error("Error in login:", error);
        // Ensure consistent error response structure if possible
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({ // Send status code via res.status()
            message: error.message || "Internal server error",
        });
    }
};

// Add a new function or middleware to verify token from header
export const protect = async (req: Request, res: Response, next: Function): Promise<any> => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        const decoded = jwt.verify(token, jwtSecret) as any; // Adjust 'as any' with a proper type if available
        // Attach user to request object
        // req.user = await User.findById(decoded.id).select('-password'); // Example: Fetch user if needed
        (req as any).user = { id: decoded.id, name: decoded.name, email: decoded.email }; // Or just attach decoded payload

        if (!(req as any).user) {
             return res.status(401).json({ message: 'User not found' });
        }
        next();
    } catch (error) {
        console.error("Token verification error:", error);
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};