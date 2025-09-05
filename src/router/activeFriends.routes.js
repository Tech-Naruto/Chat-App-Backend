import { Router } from "express";
import { jwtVerify } from "../middleware/auth.middleware.js";
import { addActiveFriend, removeActiveFriend } from "../controller/activeFriends.controller.js";

const router = Router();

router.route("/add/:activeFriend").post(jwtVerify, addActiveFriend);
router.route("/delete/:activeFriend").delete(jwtVerify, removeActiveFriend);

export default router;

