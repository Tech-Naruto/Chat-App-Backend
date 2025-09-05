import { Router } from "express";
import { jwtVerify } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";
import { countNewMessages, deleteAllMessages, deleteMessage, getLastMessage, getMessages, sendMessage } from "../controller/message.controller.js";

const router = Router();

router.route("/:username").post(jwtVerify, upload.single("file"), sendMessage);
router.route("/:username").get(jwtVerify, getMessages);
router.route("/last/:username").get(jwtVerify, getLastMessage);
router.route("/count-new/:username").get(jwtVerify, countNewMessages);
router.route("/:messageId").delete(jwtVerify, deleteMessage);
router.route("/delete-all/:username").delete(jwtVerify, deleteAllMessages);

export default router;
