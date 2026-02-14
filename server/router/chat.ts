import Router from "express";
import authenticate from "../middleware/auth";
import { chatWithContext } from "../controllers/chatController";

const chatRouter = Router();
chatRouter.post("/query", authenticate, chatWithContext);

export default chatRouter;
