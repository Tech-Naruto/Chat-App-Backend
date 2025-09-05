import ApiError from "../utilities/ApiError.js";
import ApiResponse from "../utilities/ApiResponse.js";
import { Privacy } from "../models/privacy.model.js";
import { asyncHandler } from "../utilities/asyncHandler.js";

const createPrivacy = asyncHandler(async (req, res) => {
  const privacy = await Privacy.findOne({ userId: req.user._id });

  if (privacy) {
    throw new ApiError(409, "Privacy already exists");
  }

  const newPrivacy = await Privacy.create({
    userId: req.user._id,
  });

  if (!newPrivacy) {
    throw new ApiError(500, "Privacy not created");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, newPrivacy, "Privacy created successfully"));
});

const updateLastSeenPrivacy = asyncHandler(async (req, res) => {
  const lasSeen = req.params?.value;

  if (lasSeen !== "everyone" && lasSeen !== "friends" && lasSeen !== "none") {
    throw new ApiError(400, "Invalid value");
  }

  const privacy = await Privacy.findOne({ userId: req.user._id });

  if (!privacy) {
    throw new ApiError(404, "Privacy not found");
  }

  if (lasSeen === privacy.lastSeen) {
    throw new ApiError(409, "Privacy already exists");
  }

  privacy.lastSeen = lasSeen;
  const updatedPrivacy = await privacy.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, updatedPrivacy, "Privacy updated successfully"));
});

const updateStatusPrivacy = asyncHandler(async (req, res) => {
  const status = req.params?.value;

  if (status !== "everyone" && status !== "friends" && status !== "none") {
    throw new ApiError(400, "Invalid value");
  }

  const privacy = await Privacy.findOne({ userId: req.user._id });

  if (!privacy) {
    throw new ApiError(404, "Privacy not found");
  }

  if (status === privacy.status) {
    throw new ApiError(409, "Privacy already exists");
  }

  privacy.status = status;
  const updatedPrivacy = await privacy.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, updatedPrivacy, "Privacy updated successfully"));
});

export { createPrivacy, updateLastSeenPrivacy, updateStatusPrivacy };
