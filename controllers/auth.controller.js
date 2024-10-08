require("dotenv").config();
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const ErrorResponse = require("../utils/errorResponse.js");
const { sendOtp } = require("../utils/sendOtp");
//const client = new twilio(process.env.TwilloaccountSid, process.env.TwilloauthToken);
const User = require("../models/Users");
const { createToken } = require("../utils/createTokens");

//First entry onboarding
//Resend Auth
exports.RegisterWithOtp = async (req, res, next) => {
  const { email } = req.body;

  if (!email) return next(new ErrorResponse("add email to continue", 201));

  const userCheck = await User.findOne({ email: req.body.email });
  if (userCheck) {
    return next(
      new ErrorResponse("User aleady exists, verify account to continue", 201)
    );
  }
  try {
    const otp = crypto.randomInt(100000, 1000000); // Generates a 7-character OTP
    // Calculate the OTP expiration time (e.g., 5 minutes from now)
    const Expire = Date.now() + 5 * 60 * 1000; // Current timestamp + 300 seconds (5 minutes)
    let user = new User({
      email: email,
      otp: otp,
      otpExpire: Expire,
    });
    user = await user.save();

    await sendOtp("email", otp, req.body.email, next);
    return res.status(200).json({ status: true, message: "otp sent" });
  } catch (error) {
    next(error);
  }
};

//Resend Auth
exports.ResendOtp = async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new ErrorResponse("Email  doesnt exist", 401));
  }
  try {
    const otp = crypto.randomInt(100000, 1000000); // Generates a 7-character OTP
    // Calculate the OTP expiration time (e.g., 5 minutes from now)
    const Expire = Date.now() + 5 * 60 * 1000; // Current timestamp + 300 seconds (5 minutes)
    await User.findOneAndUpdate(
      { _id: user._id },
      { $set: { otp: otp, otpExpire: Expire } }
    );

    await sendOtp("email", otp, req.body.email, next);
    // if (!sent.status) return next(new ErrorResponse(sent.message, 401));

    res.status(200).json({ status: true, message: "otp Resent" });
  } catch (error) {
    next(error);
  }
};

//Verify otp
exports.VerifyOtpSignUp = async (req, res, next) => {
  //send Otp to req.body.number
  const otpRecieved = req.body.otp;
  const user = await User.findOne({ otp: otpRecieved });
  if (!user) {
    return next(new ErrorResponse("Invalid otp sent", 401));
  }

  try {
    if (user.otp !== otpRecieved) {
      return next(new ErrorResponse("Otp not valid", 401));
    }

    const currentTimestamp = Date.now(); // Current timestamp in seconds
    const otpExpireTimestamp = Date.parse(user.otpExpire); // Convert otpExpire to a timestamp
    if (currentTimestamp > otpExpireTimestamp) {
      return next(new ErrorResponse("OTP has expired", 401));
    }

    await User.findOneAndUpdate(
      { otp: otpRecieved },
      { $set: { isVerified: true } },
      { new: true } // Set this to true to return the updated document
    );

    res.status(200).json({ status: true, message: "User verified" });
  } catch (error) {
    next(error);
  }
};

// users creates account header
// before storing to the database
exports.CreateAccount = async (req, res, next) => {
  const { username, phone_number, email, password } = req.body;

  try {
    //Add checks for some other things
    const userCheck = await User.findOne({ email: email });
    if (!userCheck) return next(new ErrorResponse("User not found", 401));

    if (userCheck.isVerified === false)
      return next(new ErrorResponse("User is not verified", 401));

    //Hashing passwords and referrals
    const salt = await bcrypt.genSalt();
    const hashedpassword = await bcrypt.hash(password, salt);

    const user = await User.findOneAndUpdate(
      { _id: userCheck.id },
      {
        $set: {
          username: username,
          email: email,
          password: hashedpassword,
          phone_number: phone_number,
        },
      },
      { new: true }
    );

    return res.status(200).json({ status: true, data: user });
  } catch (error) {
    // Call handleErrors function
    next(error);
  }
};

exports.loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await User.login(email, password);
    const token = createToken(user._id);
    //sendResponseWithToken(res, 200, { success: true, data: user }, token);
    return res.status(200).json({ status: true, data: user, token: token });
  } catch (err) {
    next(err);
  }
};
