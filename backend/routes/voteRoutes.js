const express = require("express");
const router = express.Router();
const controller = require("../controllers/voteController");

router.post("/verify-code", controller.verifyAccessCode);
router.post("/", controller.vote);
router.get("/check", controller.checkVoted);
router.get("/history", controller.getVoteHistory);

module.exports = router;
