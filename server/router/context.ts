import Router from "express";
import authenticate from "../middleware/auth";
import upload from "../middleware/multer";
import {
  uploadPDF,
  getContext,
  uploadAudio,
  deleteContext,
  deleteAllContext,
} from "../controllers/contextController";

const contextRouter = Router();

contextRouter.use(authenticate);

contextRouter.get("/", getContext);
contextRouter.post("/pdf", upload.single("file"), uploadPDF);
contextRouter.post("/audio-hybrid", upload.single("file"), uploadAudio);
contextRouter.delete("/all", deleteAllContext);
contextRouter.delete("/:id", deleteContext);

export default contextRouter;
