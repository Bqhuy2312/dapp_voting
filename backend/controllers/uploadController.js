const cloudinary = require("../services/cloudinary");

exports.uploadImage = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const localUploadUrl = `/uploads/${file.filename}`;

    const hasCloudinaryConfig = Boolean(
      String(process.env.CLOUDINARY_URL || "").trim() ||
      (
        String(process.env.CLOUD_NAME || "").trim() &&
        String(process.env.CLOUD_API_KEY || "").trim() &&
        String(process.env.CLOUD_API_SECRET || "").trim()
      ),
    );

    if (!hasCloudinaryConfig) {
      return res.json({
        url: localUploadUrl,
      });
    }

    try {
      const result = await cloudinary.uploader.upload(file.path);

      return res.json({
        url: result.secure_url,
      });
    } catch (cloudinaryError) {
      console.error("Cloudinary upload failed, fallback to local upload:", cloudinaryError.message);

      return res.json({
        url: localUploadUrl,
        fallback: true,
      });
    }

  } catch (err) {
    res.status(500).json(err.message);
  }
};
