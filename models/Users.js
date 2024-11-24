require("dotenv").config();
const mongoose = require("mongoose");
const { isEmail } = require("validator");
const bcrypt = require("bcrypt");
const ErrorResponse = require("../utils/errorResponse");

const userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
      sparse: true,
    },
    location: { type: String },
    phone_number: {
      type: String,
      unique: true,
      sparse: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      validate: [isEmail, "Please enter a valid email"],
    },
    password: {
      type: String,
      minlength: [8, "Minimum password length is 8 characters"],
      select: false,
    },

    // Add these fields for password reset functionality
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpire: {
      type: Date,
      select: false,
    },
    otp: {
      type: Number,
    },
    otpExpire: {
      type: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    contact_link: {
      type: String,
    },
  },
  { timestamps: true }
);

// static method to login user
userSchema.statics.login = async function (email, password) {
  if (!email || !password) {
    throw new ErrorResponse("Email and password are required", 400);
  }

  const user = await this.findOne({ email }).select("+password");

  if (!user) {
    throw new ErrorResponse("incorrect email", 401);
  }
  if (!user.isVerified) {
    throw new ErrorResponse("Sign up to proceed", 401);
  }

  if (!user.isVerified) {
    throw new ErrorResponse("Account unverified", 401);
  }
  const auth = await bcrypt.compare(password, user.password);
  if (!auth) {
    throw new ErrorResponse("incorrect password", 401);
  }

  return user;
};

userSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

userSchema.set("toJSON", {
  virtuals: true,
});

const User = mongoose.model("User", userSchema);

module.exports = User;
