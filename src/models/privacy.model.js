import mongoose, { Schema } from "mongoose";

const privacyModel = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    lastSeen: {
        type: String,
        enum: ["everyone", "friends", "none"],
        default: "everyone",
    },
    status:{
        type: String,
        enum: ["everyone", "friends", "none"],
        default: "everyone",
    }
}, { timestamps: true });

export const Privacy = mongoose.model("Privacy", privacyModel);