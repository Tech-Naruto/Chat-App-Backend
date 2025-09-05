import { v2 as cloudinary } from "cloudinary";
import ApiError from "./ApiError.js";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const transform = {
  profilePic: {
    resource_type: "auto",
    transformation: [{ quality: "auto:eco" }],
  },
  message: {
    resource_type: "auto",
    transformation: [{ quality: "auto:eco" }],
  },
};

const uploadOnCloudinary = async ({ localFilePath, type }) => {
  try {
    if (!localFilePath) {
      return null;
    }

    const response = await cloudinary.uploader.upload(
      localFilePath,
      transform[type]
    );

    console.log("File uploaded successfully:", response);
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file

    return response;
  } catch (error) {
    console.log("Cloudinary upload failed:");
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file
    throw new ApiError(500, "Cloudinary upload failed");
  }
};

const deleteOnCloudinary = async (publicId) => {
  try {
    if (!publicId) return;

    await cloudinary.uploader.destroy(publicId);
    console.log("File deleted successfully");
  } catch (error) {
    console.log("Cloudinary delete failed");
    throw new ApiError(500, "Cloudinary delete failed");
  }
};

export { uploadOnCloudinary, deleteOnCloudinary };
