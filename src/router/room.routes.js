import { Router } from "express";
import { jwtVerify } from "../middleware/auth.middleware.js";
import { createRoom, getRoom, updateIsBlocked, updateIsPresent } from "../controller/room.controller.js";

const router = Router();

router.route("/:username").post(jwtVerify, createRoom);
router.route("/:username").get(jwtVerify, getRoom);
router.route("/is-present/:username").patch(jwtVerify, updateIsPresent);
router.route("/is-blocked/:username").patch(jwtVerify, updateIsBlocked);

export default router;