const sendToken = (user, statusCode, res) => {
  const token = user.getJWTToken();
  console.log("🚀 ~ sendToken ~ token:", token)

  res.set("Authorization", `token ${token}`);

  res.status(statusCode).json({
    success: true,
    user,
    token,
  });
};

module.exports = sendToken;
