import mongoose, { Schema } from "mongoose";
import { encrypt, decrypt } from "../utilities/encrypt-decrypt.js";

const messageSchema = new Schema(
  {
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    message: {
      type: String,
      default: "",
    },
    file: {
      type: String, // Cloudinary URL,
    },
    filePublicId: {
      type: String, // Cloudinary Public ID,
    },
    visibleTo: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

messageSchema.pre("save", function (next) {
  this.message = encrypt(this.message);
  next();
});

messageSchema.methods.decrypt = function () {
  this.message = decrypt(this.message);
};

messageSchema.query.decrypt = async function () {
  // Query Helpers for Decryption of Data in Database
  const docs = await this.exec();
  return docs.map((doc) => {
    doc.message = decrypt(doc.message);
    return doc;
  });
};

export const Message = mongoose.model("Message", messageSchema);
