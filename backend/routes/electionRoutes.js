const express = require("express");
const router = express.Router();
const controller = require("../controllers/electionController");

router.post("/", controller.createElection);
router.get("/", controller.getAllElections);
router.post("/:id/end", controller.endElectionEarly);
router.get("/:id", controller.getElectionById);
router.put("/:id", controller.updateElection);
router.delete("/:id", controller.deleteElection);

module.exports = router;
