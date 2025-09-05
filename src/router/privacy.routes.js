import { Router } from "express";
import { jwtVerify } from "../middleware/auth.middleware.js";
import { createPrivacy, updateLastSeenPrivacy, updateStatusPrivacy } from "../controller/privacy.controller.js";

const router = Router();

router.route("/").post(jwtVerify, createPrivacy);
router.route("/lastSeen/:value").patch(jwtVerify, updateLastSeenPrivacy);
router.route("/status/:value").patch(jwtVerify, updateStatusPrivacy);

export default router;