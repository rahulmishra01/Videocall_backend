const UserModel = require("../models/user");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncError = require("../middleware/catchAsyncError");
const sendToken = require("../utils/jwtToken");
const bcrypt = require("bcrypt");
const OTP = require("../models/otp");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");

// Register user
const registerUser = catchAsyncError(async (req, res, next) => {
  const { fullname, email, password } = req.body;
  // check user
  const user = await UserModel.findOne({ email });
  if (user)
    return next(
      new ErrorHandler("User is already exist with this email", 401, res)
    );

  if (!password) {
    return next(new ErrorHandler("please provide password", 400, res));
  }

  const hashPassword = await bcrypt.hash(password, 10);

  const data = await UserModel.create({
    fullname,
    email,
    password: hashPassword,
  });

  // generating otp
  const random = Math.floor(Math.random() * 899999) + 100000;
  console.log("OTP--------------->>>>---------->>>>>", random);

  // saving otp in db
  await OTP.create({ email: req.body.email, otp: random });
  // send otp email
  await sendEmail(email, random);

  sendToken(data, 201, res);
});
// Verify user
const verifyUser = catchAsyncError(async (req, res, next) => {
  try {
    const email = req.body.email;
    const pwd = req.body.otp;

    if (pwd.length === 0) {
      return next(new ErrorHandler("Otp is required", 401, res));
    }
    // verifying user
    const otp = await OTP.findOne({ email });
    if (!otp) {
      return next(new ErrorHandler("Otp and user not found", 404, res));
    }

    // comparing otp
    const valid = await otp.campareOtp(pwd);

    if (valid) {
      // generating token
      const user = await UserModel.findOneAndUpdate(
        { email },
        { isVerified: true },
        { new: true }
      );

      const token = await user.getJWTToken();
      return res.status(200).json({
        access_token: token,
        message: "Token generated",
        data: {
          _id: user._id,
          name: user.fullname,
          email: user.email,
        },
      });
    } else {
      return next(new ErrorHandler("Invalid OTP", 400, res));
    }
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});
// Resend Otp
const resendOtp = catchAsyncError(async (req, res, next) => {
  const { email } = req.body;
  const checkUser = await UserModel.findOne({ email: email });
  if (!checkUser) {
    return next(new ErrorHandler("User not found!", 404, res));
  }

  const random = (Math.floor(Math.random() * 899999) + 100000).toString();

  // send resend otp email
  await sendEmail(email, random);

  const salt = await bcrypt.genSalt(10);
  const hashedOtp = await bcrypt.hash(random, salt);
  await OTP.findOneAndUpdate({ email: email }, { otp: hashedOtp });
  return res.status(200).json({ message: "otp has been sent to you email" });
});
// Login User
const loginUser = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;

  // checking if user has given email or password
  if (!email || !password) {
    return next(new ErrorHandler("Plase enter email and password", 400, res));
  }
  const user = await UserModel.findOne({ email }).select("+password");
  if (!user) {
    return next(new ErrorHandler("Invalid email", 401, res));
  } else {
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return next(new ErrorHandler("Invalid Password", 401, res));
    }
  }
  // check verify user
  if (!user.isVerified) {
    return res.status(400).json({
      success: false,
      message: "Please verify your account to continue",
      verify: false,
    });
  }
  sendToken(user, 200, res);
});
// forgot password
const forgotPassword = catchAsyncError(async (req, res, next) => {
  const { email } = req.body;
  const checkUser = await UserModel.findOne({ email: email });
  if (!checkUser) {
    return next(new ErrorHandler("user not found!", 404, res));
  }
  const random = (Math.floor(Math.random() * 899999) + 100000).toString();

  // send forgot password otp email
  await sendEmail(email, random);

  const salt = await bcrypt.genSalt(10);
  const hashedOtp = await bcrypt.hash(random, salt);
  await UserModel.findOneAndUpdate(
    { email },
    {
      forgotPasswordOtp: hashedOtp,
      forgotPasswordOtpExpire: Date.now() + 5 * 60 * 1000,
    }
  );
  return res.status(200).json({ message: "otp has been sent to you email" });
});
// verify forgot password
const verifyForgotPassword = catchAsyncError(async (req, res, next) => {
  const { email, forgotPasswordOtp } = req.body;
  if (!forgotPasswordOtp) {
    return next(new ErrorHandler("Otp cannot be blank", 403, res));
  }
  // verifying user
  const user = await UserModel.findOne({
    email,
    forgotPasswordOtpExpire: { $gt: Date.now() },
  });
  if (!user) {
    return next(new ErrorHandler("session expired", 401, res));
  }
  const valid = await user.campareForgotPasswordOtp(forgotPasswordOtp);
  if (valid) {
    const resetToken = crypto.randomBytes(20).toString("hex");
    await UserModel.findOneAndUpdate(
      { email },
      {
        forgotPasswordOtp: "",
        forgotPasswordOtpExpire: "",
        resetPasswordToken: crypto
          .createHash("sha256")
          .update(resetToken)
          .digest("hex"),
        resetPasswordTokenExpire: Date.now() + 5 * 60 * 1000,
      }
    );
    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      data: `Reset Token`,
      token: resetToken,
    });
  }
});
// reset password
const resetPassword = async (req, res, next) => {
  try {
    const { email, resetToken } = req.body;
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const user = await UserModel.findOne({ email: email });
    if (resetPasswordToken !== user.resetPasswordToken) {
      return next(new ErrorHandler("Invalid Token", 401, res));
    }
    let expiryTime = new Date(user.resetPasswordTokenExpire);
    if (expiryTime.getTime() < Date.now()) {
      return next(new ErrorHandler("Session expired", 400, res));
    }
    const { newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
      return next(new ErrorHandler("password not matched", 403, res));
    }
    const selt = await bcrypt.genSalt(10);
    const handleData = await bcrypt.hash(newPassword, selt);
    const data = await UserModel.findOneAndUpdate(
      { email },
      {
        password: handleData,
        resetPasswordToken: "",
        resetPasswordTokenExpire: "",
      }
    );
    return res.status(200).json({ message: "password has been updated", data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const LoginWithAuth = catchAsyncError(async (req, res, next) => {
  try {
    const { fullname, email, password } = req.body;
    if (fullname && email && password) {
      // login
      const user = await UserModel.findOne({ password });
      if (user) {
        sendToken(user, 200, res);
        return;
      }
      const data = await UserModel.create({
        fullname: fullname ? fullname : "",
        email: email ? email : "",
        password,
        isVerified: true,
      });
      sendToken(data, 200, res);
      return;
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400, res));
  }
});

const profile = catchAsyncError(async (req, res, next) => {
  try {
    const id = req.user.id;
    const user = await UserModel.findOne({ _id: id });
    sendToken(user, 200, res);
  } catch (error) {
    return next(new ErrorHandler(error.message, 400, res));
  }
});

module.exports = {
  registerUser,
  verifyUser,
  resendOtp,
  loginUser,
  forgotPassword,
  verifyForgotPassword,
  resetPassword,
  LoginWithAuth,
  profile,
};
