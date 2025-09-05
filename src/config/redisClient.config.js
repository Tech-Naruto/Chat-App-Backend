import { Redis } from "ioredis";
import { User } from "../models/user.model.js";

const redisClient = new Redis({
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

redisClient.on("connect", () => {
  console.log("✅ Redis Client connected");
});

redisClient.on("close", (error) => {
  console.log("❌ Redis Client disconnected");
});

redisClient.on("error", (err) => {
  console.error("⚠️ Redis error:", err.message);
});

export { redisClient };
