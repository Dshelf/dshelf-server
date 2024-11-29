const bcrypt = require("bcrypt");
const ErrorResponse = require("../utils/errorResponse.js");
const jwt = require("jsonwebtoken");
const { sendPasswordEmail } = require("../utils/email");
const User = require("../models/Users.js");


exports.ForgetPasswordRequest = async (req, res, next) => {
  try {
    const { email } = req.body; // Using body instead of params

    // Find user by email
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select("+password");
    if (!user) {
      return next(new ErrorResponse("User does not exist", 404));
    }

    // Generate a unique reset token
    const secret = process.env.JWT_SECRET + user.password;
    const payload = {
      email: user.email,
      id: user._id,
    };
    const token = jwt.sign(payload, secret, { expiresIn: "1h" }); // Expiry set to 1 hour

    // Construct the reset password link
    const link = `${req.protocol}://${req.get(
      "host"
    )}/reset-password/?token=${token}&user=${user._id}`;

    // Send password reset email
    const emailResponse = await sendPasswordEmail(link, email);
    if (!emailResponse) {
      return next(new ErrorResponse("Failed to send reset email.", 500));
    }

    res
      .status(200)
      .json({ success: true, message: "Password reset email sent" });
  } catch (error) {
    next(error);
  }
};


exports.ForgetPasswordUpdate = async (req, res, next) => {
  const { new_password, token, user_Id } = req.body; // All inputs from req.body

  try {
    // Find the user by ID
    const user = await User.findOne({ _id: user_Id }).select("+password");
    if (!user) {
      return next(new ErrorResponse("User does not exist", 404));
    }

    // Verify the token using the user's password as part of the secret
    jwt.verify(
      token,
      process.env.JWT_SECRET + user.password,
      async (err, decodedToken) => {
        if (err) {
          return next(new ErrorResponse("Invalid or expired token", 401));
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);

        // Update the user's password
        const updatedUser = await User.findOneAndUpdate(
          { _id: decodedToken.id },
          { $set: { password: hashedPassword } },
          { new: true }
        );

        // Handle success response
        if (updatedUser) {
          return res.status(200).json({
            success: true,
            message: "Password updated successfully",
          });
        } else {
          return next(new ErrorResponse("Failed to update password", 500));
        }
      }
    );
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
 