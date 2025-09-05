import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema({
    username: {
        type: String,
        required: [true, "Username is required"],
        unique: true,
        index: true,
        trim: true
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        index: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minLength: [8, "Password must be at least 8 characters"]
    },
    profilePic: {
        type: String // Cloudinary URL
    },
    profilePicPublicId: {
        type: String // Cloudinary Public ID
    },
    contactFriends:[
        {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    activeFriends: [
        {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    isOnline: {
        type: Boolean,
        default: false,
    },
    lastSeen: {
        type: Date,
    },
    refreshToken: {
        type: String,       
    }
}, { timestamps: true });

userSchema.pre("save", async function(next){
    if(this.isModified("password")){
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
})

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password);
}

userSchema.methods.generateAccessToken = async function(){
    return jwt.sign({
        _id: this._id,
        username: this.username,
        email: this.email
    }, process.env.JWT_ACCESS_SECRET_KEY, { expiresIn: process.env.JWT_ACCESS_SECRET_KEY_EXPIRY });
}

userSchema.methods.generateRefreshToken = async function(){
    return jwt.sign({
        _id: this._id,
    }, process.env.JWT_REFRESH_SECRET_KEY, { expiresIn: process.env.JWT_REFRESH_SECRET_KEY_EXPIRY });
}

export const User = mongoose.model("User", userSchema);