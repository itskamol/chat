import { Router } from 'express';
import * as UserController from '../controllers/UserController';
import { protect } from '../controllers/AuthController'; // Import the protect middleware

const userRouter: Router = Router();

// Protect the /contacts route with the 'protect' middleware
userRouter.get('/', protect, UserController.getContacts);

export default userRouter;
