import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { Room } from "../models/room.model.js";
import { asyncHandler } from "../utilities/asyncHandler.js";
import ApiError from "../utilities/ApiError.js";
import {
  deleteOnCloudinary,
  uploadOnCloudinary,
} from "../utilities/cloudinary.js";

const sendMessage = asyncHandler(async (req, res) => {
  const receiverUsername = req.params?.username;

  if (receiverUsername === req.user.username) {
    throw new ApiError(400, "You cannot send a message to yourself");
  }

  const receiverData = await User.findOne({ username: receiverUsername });

  if (!receiverData) {
    throw new ApiError(404, "Username not found");
  }

  const receiverId = receiverData._id;
  const senderId = req.user._id;
  const roomId = [senderId, receiverId].sort().join("_");
  const message = req.body?.message;
  const visibleTo = [senderId, receiverId];
  const file = req.file?.path;

  if (!message && !file) {
    throw new ApiError(400, "Please provide either message or file");
  }

  const newMessage = {
    roomId,
    senderId,
    receiverId,
    message,
    visibleTo,
  };

  if (file) {
    const response = await uploadOnCloudinary({
      localFilePath: file,
      type: "message",
    });

    newMessage.file = response.secure_url;
    newMessage.filePublicId = response.public_id;
  }

  const savedMessage = await Message.create(newMessage);

  if (!savedMessage) {
    throw new ApiError(500, "Could not save message");
  }

  savedMessage.decrypt();
  return res.status(200).json(savedMessage);
});

const getMessages = asyncHandler(async (req, res) => {
  const friendUsername = req.params?.username;

  if (friendUsername === req.user.username) {
    throw new ApiError(400, "You cannot get messages from yourself");
  }

  const friend = await User.findOne({ username: friendUsername }).select(
    "-password -refreshToken"
  );

  if (!friend) {
    throw new ApiError(404, "Username not found");
  }

  const roomId = [req.user._id, friend._id].sort().join("_");

  const query = {
    roomId,
    visibleTo: { $in: [req.user._id] },
  };

  const lastMessageCreatedAt = req.query?.lastMessageCreatedAt;

  if (lastMessageCreatedAt !== "undefined") {
    query.createdAt = { $lt: lastMessageCreatedAt };
  }

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(10)
    .decrypt();

  return res.status(200).json(messages);
});

const getLastMessage = asyncHandler(async (req, res) => {
  const friendUsername = req.params?.username;

  if (friendUsername === req.user.username) {
    throw new ApiError(400, "You cannot get messages from yourself");
  }

  const friend = await User.findOne({ username: friendUsername }).select(
    "-password -refreshToken"
  );

  if (!friend) {
    throw new ApiError(404, "Username not found");
  }

  const roomId = [req.user._id, friend._id].sort().join("_");

  const query = {
    roomId,
    visibleTo: { $in: [req.user._id] },
  };

  const lastMessage = await Message.findOne(query)
    .sort({ createdAt: -1 });

  lastMessage?.decrypt();

  return res.status(200).json(lastMessage);
});

const countNewMessages = asyncHandler(async (req, res) => {
  const friendUsername = req.params?.username;
  if (friendUsername === req.user.username) {
    throw new ApiError(400, "You cannot get messages from yourself");
  }

  const friend = await User.findOne({ username: friendUsername }).select(
    "-password -refreshToken"
  );

  if (!friend) {
    throw new ApiError(404, "Username not found");
  }

  const roomId = [req.user._id, friend._id].sort().join("_");

  const roomData = await Room.findOne({ roomId, friendId: req.user._id });

  const lastSeenInRoom = roomData?.updatedAt || new Date(0);

  const messageCount = await Message.countDocuments({
    roomId,
    senderId: friend._id,
    visibleTo: { $in: [req.user._id] },
    createdAt: { $gt: lastSeenInRoom },
  });

  return res.status(200).json({ count: messageCount });
});

const deleteMessage = asyncHandler(async (req, res) => {
  const messageId = req.params?.messageId;
  const deleteFor = req.query?.deleteFor;

  const message = await Message.findById(messageId);
  if (!message) {
    throw new ApiError(400, "Please provide a valid message id");
  }

  if (!deleteFor || deleteFor === "me") {
    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      {
        $pull: {
          visibleTo: req.user._id,
        },
      },
      { new: true }
    );

    if (updatedMessage.visibleTo.length === 0) {
      if (updatedMessage.filePublicId) {
        await deleteOnCloudinary(updatedMessage.filePublicId);
      }
      await Message.findByIdAndDelete(updatedMessage._id);
    }
  } else if (deleteFor === "everyone") {
    if (!message.senderId.equals(req.user._id)) {
      throw new ApiError(400, "You are not authorized to delete this message");
    }
    if (message.filePublicId) {
      await deleteOnCloudinary(message.filePublicId);
    }
    await Message.findByIdAndDelete(messageId);
  }

  return res.status(200).json(null);
});

const deleteAllMessages = asyncHandler(async (req, res) => {
  const receiverUsername = req.params?.username;

  const receiver = await User.findOne({ username: receiverUsername });

  if (!receiver) {
    throw new ApiError(404, "Username not found");
  }

  const receiverId = receiver._id;
  const senderId = req.user._id;
  const roomId = [senderId, receiverId].sort().join("_");

  await Message.updateMany({ roomId }, { $pull: { visibleTo: senderId } });

  await Message.deleteMany({ roomId, visibleTo: { $size: 0 } });

  return res.status(200).json(null);
});

export { sendMessage, getMessages, deleteMessage, deleteAllMessages, getLastMessage, countNewMessages };
