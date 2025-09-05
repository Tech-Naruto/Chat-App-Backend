import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { Room } from "../models/room.model.js";
import cookie from "cookie";
import { redisClient } from "./redisClient.config.js";
import { WebSocketServer } from "ws";
import {
  handleRedisSubscription,
  wsClients,
} from "./redisSubscriber.config.js";
import { ObjectId } from "mongodb";

const extractUser = async (accessToken, ws) => {
  if (!accessToken) {
    ws.close(4001, "No access token found"); // ws.close(code, reason);
    return;
  }

  let user;
  try {
    const decodedToken = jwt.verify(
      accessToken,
      process.env.JWT_ACCESS_SECRET_KEY
    );

    user = await User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      ws.close(4003, "Invalid access token");
      return;
    }
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      ws.close(4002, "Access token expired");
      return;
    }
  }

  return user;
};

export const webSocketConfig = async (server) => {
  const wss = new WebSocketServer({ server });

  handleRedisSubscription(wss);

  wss.on("connection", async (ws, req) => {
    console.log("✅ WebSocket connected backend");

    const cookies = cookie.parse(req.headers.cookie || "");
    const accessToken = cookies?.accessToken;

    const user = await extractUser(accessToken, ws);
    const userId = user?._id.toString();

    if (!userId) {
      return;
    }

    wsClients.set(userId, ws);

    // Make user online in redis.
    await redisClient.set(`presence:${userId}`, "online", "EX", 180);
    console.log("✅ Key created: presence:", userId);

    user.isOnline = true;
    user.lastSeen = undefined;
    await user.save({ validateBeforeSave: false });

    // Broadcast presence event
    await redisClient.publish(
      "presence-events",
      JSON.stringify({
        userId: userId,
        isOnline: true,
        timeStamp: Date.now(),
      })
    );

    // On disconnect
    ws.on("close", async (code, reason) => {
      console.log("❌ WebSocket disconnected backend");
      console.log("🔍 Code:", code);
      console.log("🔍 Reason:", reason.toString("utf8"));

      wsClients.delete(userId);
      await redisClient.publish(
        "presence-events",
        JSON.stringify({
          userId: userId,
          isOnline: false,
          timeStamp: Date.now(),
        })
      );
      await redisClient.del(`presence:${userId}`);
      const friendId = await redisClient.get(`room-presence:${userId}`);
      if (friendId) {
        await redisClient.publish(
          "room-presence-events",
          JSON.stringify({
            userId: userId,
            roomId: [userId, friendId].sort().join("_"),
            friendId: friendId,
            isPresent: "false",
          })
        );
        console.log("Deleted room presence");
        await redisClient.del(`room-presence:${userId}`);
        await Room.findOneAndUpdate(
          {
            roomId: [userId, friendId].sort().join("_"),
            friendId: new ObjectId(userId),
          },
          { isPresent: false }
        );
      }

      if (code === 4001 || code === 4002 || code === 4003) {
        console.log(
          "❌ WebSocket disconnected backend due to authentication error"
        );
        return;
      }

      user.isOnline = false;
      user.lastSeen = Date.now();
      await user.save({ validateBeforeSave: false });
    });

    // Error
    ws.on("error", (error) => {
      console.log("⚠️ WebSocket server error:", error);
    });

    // Heartbeat
    ws.on("message", async (msg) => {
      const data = JSON.parse(msg);
      if (data.type === "heartbeat") {
        console.log("💓 Heartbeat received from", userId);
        await redisClient.expire(`presence:${userId}`, 180);
      }
      if (data.type === "message") {
        console.log("✅ WebSocket message received backend");
        const ws = wsClients.get(data.receiverId);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(data));
        }
      }
      if (data.type === "room") {
        console.log("✅ WebSocket room message received backend", data);
        if (data.isPresent === "true")
          redisClient.set(`room-presence:${data.userId}`, `${data.friendId}`);
        else {
          redisClient.del(`room-presence:${data.userId}`);
        }
        await redisClient.publish(
          "room-presence-events",
          JSON.stringify({
            userId: data.userId,
            roomId: data.roomId,
            isPresent: data.isPresent,
            friendId: data.friendId,
          })
        );
      }
    });
  });
};
