module.exports = (catchAsyncError) => (req, res, next) => {
  Promise.resolve(catchAsyncError(req, res, next)).catch((err) => {
    next;
    res.json({ message: err.message.split(": ")[2]});
  });
};
