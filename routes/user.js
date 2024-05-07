const express = require("express");
const {
  registerUser,
  verifyUser,
  resendOtp,
  loginUser,
  forgotPassword,
  verifyForgotPassword,
  resetPassword,
  LoginWithAuth,
  profile,
} = require("../controllers/user");
const { isAuthincated } = require("../middleware/authincation");

const router = express.Router();

router.post("/register", registerUser);
router.post("/verifyAccount", verifyUser);
router.put("/resendOtp", resendOtp);
router.post("/login", loginUser);
router.put("/forgotPassword", forgotPassword);
router.put("/forgotResendOtp", forgotPassword);
router.put("/verifyForgotPassword", verifyForgotPassword);
router.put("/resetPassword", resetPassword);
router.post("/loginWithAuth", LoginWithAuth);
router.get("/profile", isAuthincated, profile);

router.get("/fail", (req, res) => {
  res.send("Failed attempt");
});

router.get("/", (req, res) => {
  res.send("Success done !");
});

module.exports = router;
