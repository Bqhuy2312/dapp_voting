const cloudinary = require("../services/cloudinary");

exports.uploadImage = async (req, res) => {
  try {
    const file = req.file;

    const result = await cloudinary.uploader.upload(file.path);

    res.json({
      url: result.secure_url
    });

  } catch (err) {
    res.status(500).json(err.message);
  }
};