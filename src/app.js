import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import "./config/dotenv.config.js";
import "./utilities/encrypt-decrypt.js";
import { webSocketConfig } from "./config/webSocket.config.js";
import userRouter from "./router/user.routes.js";
import messageRouter from "./router/message.routes.js";
import roomRouter from "./router/room.routes.js";
import privacyRouter from "./router/privacy.routes.js";
import activeFriendRouter from "./router/activeFriends.routes.js";
import contactFriendRouter from "./router/contactFriends.routes.js";

const app = express();
const server = http.createServer(app);

webSocketConfig(server);

app.use(cors({ origin: "https://chat-app-delta-henna-92.vercel.app", credentials: true }));

app.use(
  express.json({
    limit: "50kb",
  })
);
app.use(express.urlencoded({ extended: true, limit: "50kb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.use("/api/v1/users", userRouter);
app.use("/api/v1/messages", messageRouter);
app.use("/api/v1/rooms", roomRouter);
app.use("/api/v1/privacy", privacyRouter);
app.use("/api/v1/active-friends", activeFriendRouter);
app.use("/api/v1/contact-friends", contactFriendRouter);

app.use((err, req, res, next) => {
  const statusCode = err.status || 500;

  const response = {
    message: err.message,
    errors: err.errors,
    success: err.success,
    status: statusCode,
  };

  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  return res.status(response.status).json(response);
});

export { server, app };
