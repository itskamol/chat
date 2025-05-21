import { Router } from "express";
import * as AuthController from "../controllers/AuthController";

const userRouter: Router = Router();

userRouter.post("/register", AuthController.register);
userRouter.post("/login", AuthController.login);

export default userRouter;