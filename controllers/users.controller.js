const bcrypt = require("bcrypt");
const ErrorResponse = require("../utils/errorResponse.js");
const jwt = require("jsonwebtoken");
const { sendPasswordEmail } = require("../utils/email");
const User = require("../models/Users.js");

/*
 * This is to request change if the user forgets their password
 *
 */
exports.ForgetPasswordRequest = async (req, res, next) => {
  const { email } = req.params;
  const user = await User.findOne({ email: email }).select("+password");
  if (!user) return next(new ErrorResponse("user does not exist", 401));
  const secret = process.env.JWT_SECRET + user.password;
  const payload = {
    email: user.email,
    id: user._id,
  };
  const token = jwt.sign(payload, secret, { expiresIn: "1h" }); // Set the expiration time as needed
  const link = `${req.protocol}://${req.host}/reset-password/?token=${token}&user=${user._id}`;
  sendPasswordEmail(link, email);
  res.status(200).json({ status: true, message: "email sent" });
};

/**
 * this is to update password after requesting
 *
 */
exports.ForgetPasswordUpdate = async (req, res, next) => {
  const { new_password, token, user_Id } = req.body;
  try {
    const user = await User.findOne({ _id: user_Id }).select("+password");
    if (!user) return next(new ErrorResponse("User doesnt exist", 401));
    jwt.verify(
      token,
      process.env.JWT_SECRET + user.password,
      async (err, decodedToken) => {
        if (err) {
          return next(new ErrorResponse("invalid token", 401));
        } else {
          const salt = await bcrypt.genSalt();
          const hash = await bcrypt.hash(new_password, salt);
          const user = await User.findOneAndUpdate(
            { _id: decodedToken.id },
            {
              $set: { password: hash },
            },
            { new: true }
          );
          // Handle success case
          if (user) return res.status(200).json({ status: true, data: user });
        }
      }
    );
  } catch (error) {
    // Handle error case
    next(error);
  }
};

/**
 * this is to update the user password
 *
 */
exports.UpdatePassword = async (req, res, next) => {
  const { old_password, new_password } = req.body;

  try {
    const checkUser = await User.findById({ _id: req.user._id }).select(
      "+password"
    );
    if (!checkUser) return next(new ErrorResponse("No user found", 401));
    // compare passwords
    const comparepass = await bcrypt.compare(old_password, checkUser.password);
    if (!comparepass)
      return next(new ErrorResponse("Old password doesnt match", 401));

    const salt = await bcrypt.genSalt();
    const hashedpassword = await bcrypt.hash(new_password, salt);
    const updatePassword = await User.findOneAndUpdate(
      { _id: req.user._id },
      {
        $set: { password: hashedpassword },
      },
      { new: true }
    );

    if (updatePassword)
      res.status(200).json({
        status: true,
        data: updatePassword,
        message: "Password updated",
      });
  } catch (error) {
    next(error);
  }
};

/**
 * Get User Profile
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.GetProfile = async (req, res, next) => {
  try {
    console.log("hiiiiiiiiiiii aah");
    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new ErrorResponse(`user not found.`, 401));
    }
    res.status(200).json({ status: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * this route is to update user profile
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.updateProfile = async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return next(new ErrorResponse(`user not found.`, 401));
  }

  var objForUpdate = {};

  if (req.body.email) objForUpdate.email = req.body.email;
  if (req.body.username) objForUpdate.username = req.body.username;
  if (req.body.location) objForUpdate.location = req.body.location;
  if (req.body.phone_number) objForUpdate.phone_number = req.body.phone_number;

  try {
    const updateduser = await User.findOneAndUpdate(
      { _id: req.user._id },
      { $set: objForUpdate },
      { new: true }
    );

    res
      .status(200)
      .json({ status: true, data: updateduser, message: "Profile updated" });
  } catch {
    next(error);
  }
};
