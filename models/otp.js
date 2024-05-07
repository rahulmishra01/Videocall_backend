const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const OtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
    },
    otp: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: { expires: 300 },
    },
  },
  { timestamps: true }
);

OtpSchema.pre("save", async function () {
  const salt = await bcrypt.genSalt(10);
  this.otp = await bcrypt.hash(this.otp, salt);
});

OtpSchema.methods.campareOtp = async function (otp) {
  const isMatch = await bcrypt.compare(otp, this.otp);
  return isMatch;
};

module.exports = mongoose.model("Otp", OtpSchema);
