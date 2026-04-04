const express = require("express");
const router = express.Router();
const multer = require("multer");
const uploadController = require("../controllers/uploadController");

const upload = multer({ dest: "uploads/" }); // Lưu file tạm thời vào thư mục uploads
router.post("/", upload.single("image"), uploadController.uploadImage); // Route để upload ảnh, trường form-data là "image"

module.exports = router;