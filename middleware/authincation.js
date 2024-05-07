const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncError = require("./catchAsyncError");
const userModel = require("../models/user");
const jwt = require("jsonwebtoken");

exports.isAuthincated = catchAsyncError(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new ErrorHandler("Please login to access this", 401, res));
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return next(new ErrorHandler("Please fill right token here", 401, res));
  }
  const decodedData = jwt.verify(token, process.env.JWT_SECRET);
  req.user = await userModel.findById(decodedData.id);
  next();
});
