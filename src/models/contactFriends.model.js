import mongoose, { Schema } from "mongoose";

const contactFriendsSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    friendId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
}, { versionKey: false });

export const ContactFriends = mongoose.model("Contact Friends", contactFriendsSchema);