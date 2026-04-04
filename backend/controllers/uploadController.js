const cloudinary = require("../services/cloudinary");

// Xử lý upload ảnh và ưu tiên Cloudinary, fallback về file local nếu cần.
exports.uploadImage = async (req, res) => {
  // Kiểm tra nếu không có file nào được upload
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "Image file is required" });
    }
    // URL tạm thời của file đã upload lên server
    const localUploadUrl = `/uploads/${file.filename}`;
    // Kiểm tra cấu hình Cloudinary
    const hasCloudinaryConfig = Boolean(
      String(process.env.CLOUDINARY_URL || "").trim() ||
      (
        String(process.env.CLOUD_NAME || "").trim() &&
        String(process.env.CLOUD_API_KEY || "").trim() &&
        String(process.env.CLOUD_API_SECRET || "").trim()
      ),
    );
    // Nếu không có cấu hình Cloudinary, trả về URL local
    if (!hasCloudinaryConfig) {
      return res.json({
        url: localUploadUrl,
      });
    }
    // Nếu có cấu hình Cloudinary, thử upload lên Cloudinary
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
