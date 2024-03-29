import express, { Request, Response } from "express";
import {
  register,
  confirmEmail,
  login,
  refreshToken,
  getAllUsers,
  editUsername,
  deleteUser,
  suggestUsers,
} from "../service/user.service";
import { registrationValidationRules } from "../model/dto/registration.dto";
import { emailConfirmationValidationRules } from "../model/dto/confirm-email.dto";
import { validate } from "../provider/validator";
import { loginValidationRules } from "../model/dto/login.dto";
import { adminMiddleware } from "../middleware/admin.middleware";
import asyncTryCatchMiddleware from "../middleware/handle-error.middleware";
import { getAllOnlineUsers, setOffline } from "../service/user-status.service";
import { clearUserSocket } from "../service/user-socket.service";
import { io } from "../provider/socket";

let userRouter = express.Router();

userRouter.post(
  "/register",
  registrationValidationRules,
  asyncTryCatchMiddleware(async (req: Request, res: Response) => {
    await validate(
      req,
      res,
      async () => {
        const { email, username, password } = req.body;
        const response = await register({ email, username, password });
        res.status(201).json(response);
      },
      registrationValidationRules
    );
  })
);

userRouter.post(
  "/confirm-email",
  emailConfirmationValidationRules,
  asyncTryCatchMiddleware(async (req: Request, res: Response) => {
    await validate(
      req,
      res,
      async () => {
        const { otp, email } = req.body;
        const tokenDto = await confirmEmail({ otp, email });
        res.status(200).json(tokenDto);
      },
      emailConfirmationValidationRules
    );
  })
);

userRouter.post(
  "/login",
  loginValidationRules,
  asyncTryCatchMiddleware(async (req: Request, res: Response) => {
    await validate(
      req,
      res,
      async () => {
        const { email, password } = req.body;
        const tokenDto = await login({ email, password });
        res.status(200).json(tokenDto);
      },
      loginValidationRules
    );
  })
);

userRouter.post(
  "/refresh-token",
  asyncTryCatchMiddleware(async (req: Request, res: Response) => {
    const refreshTokenFromHeader = req.header("refresh-token");

    if (refreshTokenFromHeader === undefined) {
      res.status(400).json({ error: "refresh token not provided" });
    }
    res.json(await refreshToken(refreshTokenFromHeader!));
  })
);

userRouter.get(
  "/admin/all",
  adminMiddleware,
  asyncTryCatchMiddleware(async (req: Request, res: Response) => {
    res.json(await getAllUsers());
  })
);

userRouter.patch(
  "/:id",
  asyncTryCatchMiddleware(async (req: Request, res: Response) => {
    const id = +req.params.id;
    const username = req.query.username as string;
    res.json(await editUsername(id, username));
  })
);

userRouter.delete(
  "/:id",
  asyncTryCatchMiddleware(async (req: Request, res: Response) => {
    await deleteUser(+req.params.id);
    res.status(204);
  })
);

userRouter.get(
  "/suggest",
  asyncTryCatchMiddleware(async (req: Request, res: Response) => {
    const users = await suggestUsers(req.query.query as string, +req.query.id!);
    res.json(users);
  })
);

userRouter.delete(
  "/clear-session/:id",
  asyncTryCatchMiddleware(async (req: Request, res: Response) => {
    const id = +req.params.id!;
    await clearUserSocket(id);
    await setOffline(id);

    io.emit("getOnlineUsers", await getAllOnlineUsers());

    res.status(204).end();
  })
);

export default userRouter;
