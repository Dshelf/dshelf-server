const bcrypt = require("bcrypt");
const ErrorResponse = require("../utils/errorResponse.js");
const jwt = require("jsonwebtoken");
const { sendPasswordEmail } = require("../utils/email");
const User = require("../models/Users.js");

/**
 * Sends a password reset email to the user
 */
// exports.ForgetPasswordRequest = async (req, res, next) => {
//   try {
//     const { email } = req.params;
//     const user = await User.findOne({ email }).select("+password");

//     if (!user) {
//       return next(new ErrorResponse("User does not exist", 404));
//     }

//     const secret = process.env.JWT_SECRET + user.password;
//     const payload = { email: user.email, id: user._id };
//     const token = jwt.sign(payload, secret, { expiresIn: "1h" });
//     const link = `http://localhost:5173/auth/reset-password/?token=${token}&user=${user._id}`;

//     // Await email sending and handle potential errors
//     const emailResponse = await sendPasswordEmail(link, email, next);

//     if (!emailResponse) {
//       return next(new ErrorResponse("Failed to send reset email.", 500));
//     }

//     res.status(200).json({ success: true, message: "Password reset email sent." });
//   } catch (error) {
//     next(error);
//   }
// };
exports.ForgetPasswordRequest = async (req, res, next) => {
  try {
    const { email } = req.body; // Use body instead of params for POST
    const user = await User.findOne({ email });

    if (!user) {
      return next(new ErrorResponse("User does not exist", 404));
    }

    // Generate a unique reset token
    const secret = process.env.JWT_SECRET + user.password;
    const payload = { email: user.email, id: user._id };
    const token = jwt.sign(payload, secret, { expiresIn: "1h" });

    // Construct reset link
    const link = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;

    // Send email
    const emailResponse = await sendPasswordEmail(link, email);
    if (!emailResponse) {
      return next(new ErrorResponse("Failed to send reset email.", 500));
    }

    res
      .status(200)
      .json({ success: true, message: "Password reset email sent." });
  } catch (error) {
    next(error);
  }
};



exports.ForgetPasswordUpdate = async (req, res, next) => {
  const { email, new_password, token } = req.body;

  try {
    // Input validation
    if (!email || !new_password || !token) {
      return next(new ErrorResponse("Please provide all required fields", 400));
    }

    // Password strength validation
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(new_password)) {
      return next(
        new ErrorResponse(
          "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character",
          400
        )
      );
    }

    // Find user and verify token
    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    }).select("+password");

    if (!user) {
      return next(new ErrorResponse("Invalid or expired reset token", 400));
    }

    // Verify JWT token
    const secret = process.env.JWT_SECRET + user.password;
    try {
      jwt.verify(token, secret);
    } catch (error) {
      return next(new ErrorResponse("Invalid or expired reset token", 400));
    }

    // Hash and save new password
    user.password = await bcrypt.hash(new_password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates the authenticated user's password
 */
exports.UpdatePassword = async (req, res, next) => {
  const { old_password, new_password } = req.body;

  try {
    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      return next(new ErrorResponse("User not found", 404));
    }

    const isMatch = await bcrypt.compare(old_password, user.password);
    if (!isMatch) {
      return next(new ErrorResponse("Incorrect current password", 401));
    }

    user.password = await bcrypt.hash(new_password, 10);
    await user.save();

    res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves the authenticated user's profile
 */
exports.GetProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new ErrorResponse("User not found", 404));
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates the authenticated user's profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { email, username, location, phone_number } = req.body;
    const updates = {};

    if (email) updates.email = email;
    if (username) updates.username = username;
    if (location) updates.location = location;
    if (phone_number) updates.phone_number = phone_number;

    const updatedUser = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true });
    if (!updatedUser) {
      return next(new ErrorResponse("User not found", 404));
    }

    res.status(200).json({ success: true, data: updatedUser, message: "Profile updated" });
  } catch (error) {
    next(error);
  }
};
 