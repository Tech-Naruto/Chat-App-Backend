import "./config/dotenv.config.js";
import { server } from "./app.js";
import connectDB from "./db/index.js";

connectDB()
  .then(() => {
    server.listen(process.env.PORT, () => {
      console.log(
        `✅ Backend server is live on http://localhost:${process.env.PORT}`
      );
    });
  })
  .catch((err) => {
    console.log("MongoDB app connection failed:", err);
    process.exit(1);
  });
