const express = require("express");
const router = express.Router();
const controller = require("../controllers/candidateController");

router.post("/", controller.addCandidate);
router.get("/:electionId", controller.getCandidates);
router.put("/:id", controller.updateCandidate);
router.delete("/:id", controller.deleteCandidate);

module.exports = router;
