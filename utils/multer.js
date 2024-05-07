const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/profile_img");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      Math.floor(Math.random() * 899999 + 100000) +
        path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.size > 5 * 1024 * 1024) {
      console.log("---->>file");
      cb(null, false);
      return cb(new Error("file is to large"));
    } else if (
      file.mimetype == "image/jpg" ||
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpeg"
    ) {
      return cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error("only .jpg,.jpeg,.png is allowed!"));
    }
  },
});

module.exports = { upload };
