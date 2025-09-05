import { ContactFriends } from "../models/contactFriends.model.js";
import { asyncHandler } from "../utilities/asyncHandler.js";
import ApiError from "../utilities/ApiError.js";
import { User } from "../models/user.model.js";

const addContactFriend = asyncHandler(async (req, res) => {
  const contactFriend = req.params?.contactFriend;

  if (!contactFriend) {
    return ApiError(404, "Contact friend not found");
  }

  const friend = await User.findOne({ username: contactFriend });

  if (!friend) {
    return ApiError(404, "Friend not found");
  }

  const newContactFriend = await ContactFriends.create({
    userId: req.user._id,
    friendId: friend?._id,
  });

  if (!newContactFriend) {
    throw new ApiError(500, "Internal server error");
  }

  return res.status(200).json(newContactFriend);
});

const removeContactFriend = asyncHandler(async (req, res) => {
  const contactFriend = req.params?.contactFriend;

  if (!contactFriend) {
    return ApiError(404, "Contact friend not found");
  }

  const friend = await User.findOne({ username: contactFriend });

  if (!friend) {
    return ApiError(404, "Friend not found");
  }

  await ContactFriends.deleteMany({
    userId: req.user._id,
    friendId: friend?._id,
  });

  return res
    .status(200)
    .json({ message: "Contact friend removed successfully" });
});

export { addContactFriend, removeContactFriend };
