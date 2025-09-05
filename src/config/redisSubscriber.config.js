import { Redis } from "ioredis";
import { User } from "../models/user.model.js";
import { Room } from "../models/room.model.js";
import { ActiveFriends } from "../models/activeFriends.model.js";
import { redisClient } from "./redisClient.config.js";
import { ObjectId } from "mongodb";
import WebSocket from "ws";

const wsClients = new Map();

const handleRedisSubscription = async (wss) => {
  // Subscriber redis clients
  const redisSubscriber = new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
    tls: {},
    retryStrategy: (times) => {
      if (times > 5) {
        console.log("❌ Too many Redis retries. Giving up.");

        return null; // Stop retrying
      }

      const delay = Math.min(times * 500, 3000); // Maximum delay of 3 seconds
      console.log(`🔄 Redis retry #${times} in ${delay}ms`);
      return delay;
    },
  });

  redisSubscriber.psubscribe("__keyevent@0__:expired");

  redisSubscriber.subscribe("presence-events");
  redisSubscriber.subscribe("room-presence-events");

  redisSubscriber.on("pmessage", async (pattern, channel, key) => {
    if (channel === "__keyevent@0__:expired") {
      console.log("Key expired:", key);
      const userId = key.split(":")[1];
      if (key.startsWith("presence:")) {
        await redisClient.publish(
          "presence-events",
          JSON.stringify({
            userId,
            isOnline: false,
            timeStamp: Date.now(),
          })
        );

        wsClients.delete(userId);

        const friendId = await redisClient.get(`room-presence:${userId}`);
        if (friendId) {
          await redisClient.publish(
            "room-presence-events",
            JSON.stringify({
              userId: userId,
              roomId: [userId, friendId].sort().join("_"),
              friendId: friendId,
              isPresent: false,
              timeStamp: Date.now(),
            })
          );

          await Room.findOneAndUpdate(
            {
              roomId: [userId, friendId].sort().join("_"),
              friendId: new ObjectId(userId),
            },
            { isPresent: false }
          );
        }
        redisClient.del(`room-presence:${userId}`);
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });
      }
    }
  });

  redisSubscriber.on("message", async (channel, message) => {
    console.log("WS Client:", wsClients.keys());
    if (channel === "presence-events") {
      const data = JSON.parse(message);
      const friendsList = await ActiveFriends.find({
        friendId: data.userId,
      }).select("userId");

      friendsList.forEach((friend) => {
        const ws = wsClients.get(friend.userId.toString());

        if (ws) {
          console.log("Friend", friend);
          ws.send(
            JSON.stringify({
              type: "presence-events",
              userId: data.userId,
              isOnline: data.isOnline,
              timeStamp: data.timeStamp ? new Date(data.timeStamp) : new Date(),
            })
          );
        }
      });
    }

    if (channel === "room-presence-events") {
      const data = JSON.parse(message);
      const ws = wsClients.get(data.friendId);
      console.log("Room Presence Event", data);
      if (ws) {
        console.log("Friend", data.friendId);
        ws.send(
          JSON.stringify({
            type: "room",
            userId: data.userId,
            roomId: data.roomId,
            friendId: data.friendId,
            isPresent: data.isPresent,
            timeStamp: new Date(),
          })
        );
      }
    }
  });

  redisSubscriber.on("connect", () => {
    console.log("✅ Redis Subscriber connected");
  });

  redisSubscriber.on("close", (error) => {
    console.log("❌ Redis Subscriber disconnected");
  });

  redisSubscriber.on("error", (err) => {
    console.error("⚠️ Redis error:", err.message);
  });

  redisSubscriber.on("end", () => {
    console.error("🔌 Redis Subscriber connection closed.");
  });
};

export { handleRedisSubscription, wsClients };
