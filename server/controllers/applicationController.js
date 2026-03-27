const sendStatusEmail = require("../utils/emailService");
const Application = require("../models/Application");

exports.updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // 1. Update the status in the database

    const updatedApp = await Application.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    )
      .populate("userId")
      .populate("taskId");

    if (!updatedApp) {
      return res.status(404).json({ message: "Application not found" });
    }

    // 2. Trigger the automated email
    await sendStatusEmail(
      updatedApp.userId.email, // <--- THIS is the dynamic receiver!
      updatedApp.userId.name,
      updatedApp.taskId.title,
      status,
    );

    res
      .status(200)
      .json({ message: "Status updated and email sent!", updatedApp });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating status", error: error.message });
  }
};
