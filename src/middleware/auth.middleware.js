import jwt from "jsonwebtoken";
import { asyncHandler } from "../utilities/asyncHandler.js";
import { User } from "../models/user.model.js";
import ApiError from "../utilities/ApiError.js";

const jwtVerify = asyncHandler(async (req, _, next) => {
  // get access token from cookie
  // verify access token
  // get user details from db
  // attach user details to request object
  // next middleware

  try {
    const accessToken =
      req.cookies?.accessToken ||
      req.headers?.authorization?.replace("Bearer ", "");

    if (!accessToken) {
      throw new ApiError(401, "No access token found");
    }

    const decodedToken = jwt.verify(
      accessToken,
      process.env.JWT_ACCESS_SECRET_KEY
    );
    const user = await User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid Access Token"); // UNAUTHORIZED ERROR
    }

    req.user = user;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new ApiError(401, "Access token expired", error);
    } else {
      throw error;
    }
  }
});

export { jwtVerify };
