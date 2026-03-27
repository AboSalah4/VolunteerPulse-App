const express = require("express");
const router = express.Router();
const applicationController = require("../controllers/applicationController");

// Priority #1: VP-F10 - This route handles the status update and the automated email
router.put("/:id/status", applicationController.updateApplicationStatus);

module.exports = router;
