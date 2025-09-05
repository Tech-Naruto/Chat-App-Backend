import { User } from "../models/user.model.js";
import { ActiveFriends } from "../models/activeFriends.model.js";
import { ContactFriends } from "../models/contactFriends.model.js";
import mongoose from "mongoose";
import { asyncHandler } from "../utilities/asyncHandler.js";
import ApiError from "../utilities/ApiError.js";
import ApiResponse from "../utilities/ApiResponse.js";
import jwt from "jsonwebtoken";
import {
  deleteOnCloudinary,
  uploadOnCloudinary,
} from "../utilities/cloudinary.js";
import { ONE_DAY, SEVEN_DAYS } from "../constants.js";

const generateAccessAndRefreshToken = async (user) => {
  try {
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    console.log("Token generation failed:", error);
    throw new ApiError(500, "Token generation failed");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty
  // check if user already exists: username, email
  // check for images, check for avatar
  // upload them on cloudinary
  // create user object - create entry in db
  // remove password and refresh token from response
  // check for user creation
  //  return response

  const { username, email, password } = req.body;

  console.log("User details:", { username, email, password });

  if ([username, email, password].some((item) => item?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  let existedUser = await User.findOne({ username });

  if (existedUser) {
    throw new ApiError(409, "This username is already taken");
  }

  existedUser = await User.findOne({ email });

  if (existedUser) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const user = await User.create({
    username,
    email,
    password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "User registration failed");
  }

  return res.status(201).json(createdUser);
});

const loginUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty
  // check if user exists: username, email
  // check password
  // generate access and refresh token
  // send cookies
  // return response
  let { emailOrUsername, password } = req.body; // Here email can be email as well as username

  if ([emailOrUsername, password].some((item) => item?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  emailOrUsername = emailOrUsername.trim();

  const user = await User.findOne({
    $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
  });

  if (!user) {
    throw new ApiError(404, "Email or Username not found");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Incorrect password");
  }

  const { accessToken, refreshToken } =
    await generateAccessAndRefreshToken(user);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  console.log("loggedInUser:", loggedInUser);

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, { ...options, maxAge: ONE_DAY })
    .cookie("refreshToken", refreshToken, { ...options, maxAge: SEVEN_DAYS })
    .json(loggedInUser);
});

const logoutUser = asyncHandler(async (req, res) => {
  // jwtVerify middleware
  // retrieve user details from req
  // remove refresh token from db
  // remove cookies
  // return response

  const newData = await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: "",
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  if (!newData) {
    throw new ApiError(500, "User logout failed");
  }

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(null);
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  // verify refresh token
  // get user details from db
  // generate access and refresh token
  // send cookies

  const incomingRefreshToken =
    req.cookies.refreshToken || req.headers["x-refresh-token"]?.split(" ")[1];
  // Authorization: Bearer <access_token>
  // x-refresh-token: <refresh_token>

  if (!incomingRefreshToken) {
    throw new ApiError(401, "No refresh token found");
  }

  let user;

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.JWT_REFRESH_SECRET_KEY
    );
    user = await User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new ApiError(401, "Refresh token expired");
    }
  }

  if (!user) {
    throw new ApiError(401, "Invalid Refresh Token");
  }

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  };

  const { accessToken, refreshToken } =
    await generateAccessAndRefreshToken(user);

  return res
    .status(200)
    .cookie("accessToken", accessToken, { ...options, maxAge: ONE_DAY })
    .cookie("refreshToken", refreshToken, { ...options, maxAge: SEVEN_DAYS })
    .json(null);
});

const clearCookies = asyncHandler(async (req, res) => {
  const isInterval = req.headers["x-internal-logout"] === "true";

  if (!isInterval) {
    return res
      .status(403)
      .json({ message: "Forbidden: Invalid logout trigger" });
  }

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json({ message: "Cookies Cleared" });
});

const getUserDetails = asyncHandler(async (req, res) => {
  return res.status(200).json(req.user);
});

const updateProfile = asyncHandler(async (req, res) => {
  const { username, email } = req.body;

  console.log(username, email);

  if (!username && !email) {
    throw new ApiError(400, "Please provide at least one field to update");
  }

  let update = {};
  if (username && username !== req.user.username) {
    if (await User.findOne({ username })) {
      throw new ApiError(409, "This username is already taken");
    } else {
      update.username = username;
    }
  }
  if (email && email !== req.user.email) {
    if (await User.findOne({ email })) {
      throw new ApiError(409, "An account with this email already exists");
    } else {
      update.email = email;
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: update,
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(user);
});

const changePassword = asyncHandler(async (req, res) => {
  const { password, newPassword } = req.body;

  if (!password || !newPassword) {
    throw new ApiError(400, "Please provide both password and new password");
  }

  const user = await User.findById(req.user._id).select("-refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Password is incorrect");
  }

  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res.status(200).json(user);
});

const setProfilePic = asyncHandler(async (req, res) => {
  const localFilePath = req.file?.path;

  if (!localFilePath) {
    throw new ApiError(400, "No file uploaded");
  }

  const response = await uploadOnCloudinary({
    localFilePath,
    type: "profilePic",
  });

  const user = await User.findById(req.user._id).select(
    "-password -refreshToken"
  );

  const cloudinaryFilePublicId = user.profilePicPublicId;

  if (cloudinaryFilePublicId) {
    await deleteOnCloudinary(cloudinaryFilePublicId);
  }

  user.profilePic = response.secure_url;
  user.profilePicPublicId = response.public_id;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(user);
});

const removeProfilePic = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "-password -refreshToken"
  );

  const cloudinaryFilePublicId = user.profilePicPublicId;

  if (cloudinaryFilePublicId) {
    await deleteOnCloudinary(cloudinaryFilePublicId);
    user.profilePic = undefined;
    user.profilePicPublicId = undefined;
    await user.save({ validateBeforeSave: false });
  }

  console.log("Profile picture removed successfully");

  return res.status(200).json(user);
});

const addToActiveFriends = asyncHandler(async (req, res) => {
  const friendUsername = req.params.username;

  const friend = await User.findOne({ username: friendUsername }).select(
    "-password -refreshToken"
  );

  if (!friend) {
    throw new ApiError(404, "Friend not found");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $addToSet: {
        activeFriends: friend._id,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const activeFriend = await ActiveFriends.findOne({
    userId: req.user._id,
    friendId: friend._id,
  });

  if (!activeFriend) {
    await ActiveFriends.create({
      userId: req.user._id,
      friendId: friend._id,
    });
  }

  return res.status(200).json(user);
});

const getActiveFriendsDetails = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const activeFriends = await User.find({
    _id: { $in: user.activeFriends },
  }).select("-password -refreshToken -activeFriends -contactFriends");

  return res.status(200).json(activeFriends);
});

const removeFromActiveFriends = asyncHandler(async (req, res) => {
  const friendUsername = req.params.username;

  const friend = await User.findOne({ username: friendUsername }).select(
    "-password -refreshToken"
  );

  if (!friend) {
    throw new ApiError(404, "Friend not found");
  }

  const friendId = friend._id;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $pull: {
        activeFriends: friendId,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  await ActiveFriends.findOneAndDelete({
    userId: req.user._id,
    friendId: friendId,
  });

  return res.status(200).json(user);
});

const addToContactFriends = asyncHandler(async (req, res) => {
  const friendUsername = req.params.username;

  const friend = await User.findOne({ username: friendUsername }).select(
    "-password -refreshToken"
  );

  if (!friend) {
    throw new ApiError(404, "Friend not found");
  }

  const friendId = friend._id;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $addToSet: {
        contactFriends: friendId,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const contactFriend = await ContactFriends.findOne({
    userId: req.user._id,
    friendId: friendId,
  });

  if (!contactFriend) {
    await ContactFriends.create({
      userId: req.user._id,
      friendId: friendId,
    });
  }

  return res.status(200).json(user);
});

const getContactFriendsDetails = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const contactFriends = await User.find({
    _id: { $in: user.contactFriends },
  }).select("-password -refreshToken -activeFriends -contactFriends");

  return res.status(200).json(contactFriends);
});

const removeFromContactFriends = asyncHandler(async (req, res) => {
  const friendUsername = req.params.username;

  const friend = await User.findOne({ username: friendUsername }).select(
    "-password -refreshToken"
  );

  if (!friend) {
    throw new ApiError(404, "Friend not found");
  }

  const friendId = friend._id;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $pull: {
        contactFriends: friendId,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  await ContactFriends.findOneAndDelete({
    userId: req.user._id,
    friendId: friendId,
  });

  return res.status(200).json(user);
});

const newFriendSearch = asyncHandler(async (req, res) => {
  const search = req.params.search;
  const page = parseInt(req.query.page, 10) || 1;

  if (!search) {
    throw new ApiError(400, "Please provide a search term");
  }

  if (page < 1) {
    throw new ApiError(400, "Please provide a valid page number");
  }

  const result = await User.find({
    username: { $regex: search, $options: "i" },
  })
    .limit(10)
    .skip((page - 1) * 10)
    .select("-password -refreshToken -activeFriends -contactFriends");

  return res.status(200).json({ result, page });
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  updateProfile,
  changePassword,
  setProfilePic,
  removeProfilePic,
  addToActiveFriends,
  removeFromActiveFriends,
  addToContactFriends,
  removeFromContactFriends,
  getUserDetails,
  getActiveFriendsDetails,
  getContactFriendsDetails,
  newFriendSearch,
  clearCookies,
};
