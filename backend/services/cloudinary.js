const path = require("path");
const cloudinary = require("cloudinary").v2;
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const hasCloudinaryUrl = String(process.env.CLOUDINARY_URL || "").trim();

if (hasCloudinaryUrl) {
  cloudinary.config({
    cloudinary_url: hasCloudinaryUrl,
  });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
  });
}

module.exports = cloudinary;
