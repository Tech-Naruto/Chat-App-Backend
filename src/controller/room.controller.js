import { Room } from "../models/room.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utilities/asyncHandler.js";
import ApiError from "../utilities/ApiError.js";
import ApiResponse from "../utilities/ApiResponse.js";

const createRoom = asyncHandler(async (req, res) => {
  const friendUsername = req.params.username;

  const friend = await User.findOne({ username: friendUsername }).select(
    "-password -refreshToken"
  );

  if (!friend) {
    throw new ApiError(404, "Username not found");
  }

  const roomId = [req.user._id, friend._id].sort().join("_");

  const room = await Room.findOne({ roomId, userId: friend._id });
  if (room) {
    throw new ApiError(409, "Room already exists");
  }

  const newRoom = await Room.create({
    roomId,
    friendId: req.user._id,
    userId: friend._id,
    isPresent: true,
  });

  if (!newRoom) {
    throw new ApiError(500, "Room not created");
  }

  return res.status(200).json(newRoom);
});

const getRoom = asyncHandler(async (req, res) => {
  const friendUsername = req.params.username;

  const friend = await User.findOne({ username: friendUsername }).select(
    "-password -refreshToken"
  );

  if (!friend) {
    throw new ApiError(404, "Username not found");
  }

  const roomId = [req.user._id, friend._id].sort().join("_");

  const room = await Room.findOne({ roomId, friendId: friend._id });

  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  return res.status(200).json(room);
});

const updateIsPresent = asyncHandler(async (req, res) => {
  const friendUsername = req.params.username;
  const isPresent = req.query?.isPresent;

  if (isPresent === "undefined") {
    throw new ApiError(400, "isPresent is required");
  }

  const friend = await User.findOne({ username: friendUsername }).select(
    "-password -refreshToken"
  );

  if (!friend) {
    throw new ApiError(404, "Username not found");
  }

  const roomId = [req.user._id, friend._id].sort().join("_");

  const room = await Room.findOne({ roomId, friendId: req.user._id });
  if (!room) {
    const newRoom = await Room.create({
      roomId,
      userId: friend._id,
      friendId: req.user._id,
      isPresent: isPresent === "true",
    });
    return res.status(200).json(newRoom);
  }

  room.isPresent = isPresent === "true";
  const updatedRoom = await room.save();

  return res.status(200).json(updatedRoom);
});

const updateIsBlocked = asyncHandler(async (req, res) => {
  const friendUsername = req.params.username;
  const isBlocked = req.query?.isBlocked;

  if (isBlocked === "undefined") {
    throw new ApiError(400, "isBlocked is required");
  }

  const friend = await User.findOne({ username: friendUsername }).select(
    "-password -refreshToken"
  );

  if (!friend) {
    throw new ApiError(404, "Username not found");
  }

  const roomId = [req.user._id, friend._id].sort().join("_");

  const room = await Room.findOne({ roomId, friendId: req.user._id });

  if (!room) {
    const newRoom = await Room.create({
      roomId,
      userId: friend._id,
      friendId: req.user._id,
      isPresent: false,
      isBlocked: isBlocked === "true",
    });
    return res.status(200).json(newRoom);
  }

  room.isBlocked = isBlocked === "true";
  const updatedRoom = await room.save();

  return res.status(200).json(updatedRoom);
});

export { createRoom, getRoom, updateIsPresent, updateIsBlocked };
