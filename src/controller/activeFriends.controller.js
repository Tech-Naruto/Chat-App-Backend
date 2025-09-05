import { ActiveFriends } from "../models/activeFriends.model.js";
import { asyncHandler } from "../utilities/asyncHandler.js";
import ApiError from "../utilities/ApiError.js";
import { User } from "../models/user.model.js";

const addActiveFriend = asyncHandler(async (req, res) => {
  const activeFriend = req.params?.activeFriend;

  const friend = await User.findOne({ username: activeFriend });

  if (!friend) {
    return ApiError(404, "Friend not found");
  }

  const newActiveFriend = await ActiveFriends.create({
    userId: req.user._id,
    friendId: friend?._id,
  });

  if (!newActiveFriend) {
    throw new ApiError(500, "Internal server error");
  }

  return res.status(200).json(newActiveFriend);
});

const removeActiveFriend = asyncHandler(async (req, res) => {
  const activeFriend = req.params?.activeFriend;

  const friend = await User.findOne({ username: activeFriend });

  if (!friend) {
    return ApiError(404, "Friend not found");
  }

  await ActiveFriends.deleteMany({
    userId: req.user._id,
    friendId: friend?._id,
  });

  return res.status(200).json({ message: "Active friend removed successfully" });
});

export { addActiveFriend, removeActiveFriend };
