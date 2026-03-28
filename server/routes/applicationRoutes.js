const express = require("express");
const router = express.Router();
const applicationController = require("../controllers/applicationController");

// VP-F10 - This route handles the status update and the automated email
router.put("/:id/status", applicationController.updateApplicationStatus);

// Priority #2: VP-Q27 - Flagging logic
router.patch("/:id/flag", applicationController.flagApplication);

module.exports = router;
