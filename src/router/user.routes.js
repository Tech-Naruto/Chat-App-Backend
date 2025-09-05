import { Router } from "express";
import {
  addToActiveFriends,
  addToContactFriends,
  changePassword,
  clearCookies,
  getActiveFriendsDetails,
  getContactFriendsDetails,
  getUserDetails,
  loginUser,
  logoutUser,
  newFriendSearch,
  refreshAccessToken,
  registerUser,
  removeFromActiveFriends,
  removeFromContactFriends,
  removeProfilePic,
  setProfilePic,
  updateProfile,
} from "../controller/user.controller.js";
import { jwtVerify } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/logout").post(jwtVerify, logoutUser);
router.route("/refresh-access-token").post(refreshAccessToken);
router.route("/clear-cookies").post(clearCookies);
router.route("/details").get(jwtVerify, getUserDetails);
router.route("/profile").patch(jwtVerify, updateProfile);
router.route("/password").patch(jwtVerify, changePassword);
router
  .route("/profile-pic")
  .patch(jwtVerify, upload.single("profilePic"), setProfilePic);
router.route("/profile-pic").delete(jwtVerify, removeProfilePic);
router.route("/active-friends/:username").post(jwtVerify, addToActiveFriends);
router.route("/active-friends").get(jwtVerify, getActiveFriendsDetails);
router
  .route("/active-friends/:username")
  .delete(jwtVerify, removeFromActiveFriends);
router.route("/contact-friends/:username").post(jwtVerify, addToContactFriends);
router.route("/contact-friends").get(jwtVerify, getContactFriendsDetails)
router
  .route("/contact-friends/:username")
  .delete(jwtVerify, removeFromContactFriends);
router.route("/new-friend/:search").get(jwtVerify, newFriendSearch);
export default router;
