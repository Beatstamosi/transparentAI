import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import contextRouter from "./router/context";
import chatRouter from "./router/chat";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/context", contextRouter);
app.use("/chat", chatRouter);

app.listen(3000, () => console.log("Server running on port 3000"));
