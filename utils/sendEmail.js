const nodemailer = require("nodemailer");

const sendMail = async (email, random) => {
  try {
    const transporter = nodemailer.createTransport({
      service: process.env.SMTP_SERVICE,
      auth: {
        user: process.env.GMAIL,
        pass: process.env.MAIL_PASSWORD,
      },
    });
    const mailOptions = {
      from: process.env.GMAIL,
      to: email,
      subject: `Hello user`,
      text: `Here is your OTP:- ${random}`,
    };
    const data = await transporter.sendMail(mailOptions);
    return res.json({ data });
  } catch (error) {
    return error;
  }
};
module.exports = sendMail;