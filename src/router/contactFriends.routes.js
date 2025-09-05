import { Router } from "express";
import { jwtVerify } from "../middleware/auth.middleware.js";
import { addContactFriend, removeContactFriend } from "../controller/contactFriends.controller.js";

const router = Router();

router.route("/add/:contactFriend").post(jwtVerify, addContactFriend);
router.route("/delete/:contactFriend").delete(jwtVerify, removeContactFriend);

export default router;
