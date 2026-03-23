const express = require("express");
const router = express.Router();
const multer = require("multer");
const uploadController = require("../controllers/uploadController");

const upload = multer({ dest: "uploads/" });
router.post("/", upload.single("image"), uploadController.uploadImage);

module.exports = router;