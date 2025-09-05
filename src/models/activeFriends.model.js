import mongoose, { Schema } from "mongoose";

const activeFriendSchema = new Schema({
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

export const ActiveFriends = mongoose.model("Active Friends", activeFriendSchema);