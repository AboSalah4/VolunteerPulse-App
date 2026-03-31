const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
require("dotenv").config();
const applicationRoutes = require("./routes/applicationRoutes");

const sendEmail = require("./sendEmail");
const { upload } = require("./cloudinaryConfig");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/applications", applicationRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected!");
    // Auto-approve old tasks script
    const updateOldTasks = async () => {
      try {
        const Task = mongoose.model("Task");
        const result = await Task.updateMany(
          { status: { $exists: false } },
          { $set: { status: "Approved" } },
        );
        if (result.modifiedCount > 0) {
          console.log(
            `🌱 Auto-approved ${result.modifiedCount} existing tasks.`,
          );
        }
      } catch (err) {
        console.error("Error updating old tasks:", err);
      }
    };
    updateOldTasks();
  })
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// --- MODELS ---

const TaskSchema = new mongoose.Schema({
  title: String,
  organization: String,
  duration: Number,
  category: String,
  lat: Number,
  lng: Number,
  address: String,
  createdBy: String,
  status: { type: String, default: "Approved" },
  isFlaggedByCommunity: { type: Boolean, default: false },
  communityFlagReason: { type: String, default: "" },
  applicants: [
    {
      userId: String,
      userName: String,
      userEmail: String,
      status: { type: String, default: "Pending" },
      isFlagged: { type: Boolean, default: false },
      flagReason: { type: String, default: "" },
    },
  ],
});
const Task = mongoose.model("Task", TaskSchema);

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: "student" },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  profilePic: { type: String, default: "" },
  linkedInUrl: { type: String, default: "" },
  interests: { type: [String], default: [] },
  appliedTasks: [{ type: String }],
  savedTasks: [{ type: String }],
  totalVolunteerMinutes: { type: Number, default: 0 },
  weeklyGoal: { type: Number, default: 120 },
});
const User = mongoose.model("User", UserSchema);

// --- MODERATION ROUTES ---

app.post("/api/tasks/flag/:id", async (req, res) => {
  try {
    const { reason } = req.body;
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { isFlaggedByCommunity: true, communityFlagReason: reason },
      { new: true },
    );
    res.json({ message: "Task reported to Admin", updatedTask });
  } catch (err) {
    res.status(500).json({ error: "Reporting failed" });
  }
});

app.get("/api/admin/flagged-tasks", async (req, res) => {
  try {
    const flaggedTasks = await Task.find({ isFlaggedByCommunity: true });
    res.json(flaggedTasks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// --- GENERAL TASK ROUTES ---

app.get("/api/tasks", async (req, res) => {
  const { maxTime } = req.query;
  try {
    const tasks = await Task.find({
      status: "Approved",
      duration: { $lte: parseInt(maxTime) || 999999 },
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Fetch failed" });
  }
});

app.post("/api/tasks", async (req, res) => {
  try {
    const newTask = new Task(req.body);
    await newTask.save();
    res.status(201).json(newTask);
  } catch (err) {
    res.status(500).json({ error: "Failed to create task" });
  }
});

app.put("/api/tasks/:id", async (req, res) => {
  try {
    const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ error: "Failed to update task" });
  }
});

app.get("/api/my-tasks/:email", async (req, res) => {
  try {
    const myTasks = await Task.find({ createdBy: req.params.email });
    res.json(myTasks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

app.post("/api/update-status", async (req, res) => {
  try {
    const { taskId, userId, status } = req.body;
    const task = await Task.findById(taskId);
    const applicant = task.applicants.find((a) => a.userId === userId);
    let updatedPoints = undefined;

    if (applicant) {
      if (status === "Completed" && applicant.status !== "Completed") {
        const student = await User.findById(userId);
        if (student) {
          student.totalVolunteerMinutes =
            (student.totalVolunteerMinutes || 0) + task.duration;
          await student.save();
          updatedPoints = student.totalVolunteerMinutes;
        }
      }
      applicant.status = status;
      await task.save();
      sendEmail({
        email: applicant.userEmail,
        subject: `Update: ${task.title}`,
        message: `Your application for "${task.title}" is now ${status.toLowerCase()}.`,
      }).catch((err) => console.error("Email error:", err));
    }
    res.status(200).json({
      message: "Status updated",
      updatedPoints,
      verifiedUserId: userId,
    });
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

app.delete("/api/tasks/:id", async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

app.post("/api/apply-task", async (req, res) => {
  try {
    const { email, taskId } = req.body;
    const user = await User.findOne({ email });
    const task = await Task.findById(taskId);
    if (!user || !task) return res.status(404).json({ message: "Not found" });
    if (user.appliedTasks.includes(taskId)) {
      user.appliedTasks = user.appliedTasks.filter((id) => id !== taskId);
      task.applicants = task.applicants.filter(
        (a) => a.userId !== user._id.toString(),
      );
    } else {
      user.appliedTasks.push(taskId);
      task.applicants.push({
        userId: user._id.toString(),
        userName: user.name,
        userEmail: user.email,
        status: "Pending",
      });
    }
    await user.save();
    await task.save();
    res.status(200).json({ appliedTasks: user.appliedTasks });
  } catch (error) {
    res.status(500).json({ message: "Apply failed" });
  }
});

app.post("/api/save-task", async (req, res) => {
  try {
    const { email, taskId } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    user.savedTasks.includes(taskId)
      ? (user.savedTasks = user.savedTasks.filter((id) => id !== taskId))
      : user.savedTasks.push(taskId);
    await user.save();
    res.status(200).json({ savedTasks: user.savedTasks });
  } catch (error) {
    res.status(500).json({ message: "Save failed" });
  }
});

// --- AUTH & PROFILE ROUTES ---

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ message: "Invalid credentials" });
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePic: user.profilePic,
        linkedInUrl: user.linkedInUrl || "",
        interests: user.interests,
        appliedTasks: user.appliedTasks,
        savedTasks: user.savedTasks,
        totalVolunteerMinutes: user.totalVolunteerMinutes || 0,
        weeklyGoal: user.weeklyGoal || 120,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "User created!" });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/update-interests", async (req, res) => {
  const { email, interests } = req.body;
  const user = await User.findOneAndUpdate(
    { email },
    { interests },
    { new: true },
  );
  res.json({ interests: user.interests });
});

app.post("/api/update-linkedin", async (req, res) => {
  const { email, linkedInUrl } = req.body;
  const user = await User.findOneAndUpdate(
    { email },
    { linkedInUrl },
    { new: true },
  );
  res.json({ linkedInUrl: user.linkedInUrl });
});

app.post("/api/update-goal", async (req, res) => {
  try {
    const { email, weeklyGoal } = req.body;
    const user = await User.findOneAndUpdate(
      { email },
      { weeklyGoal },
      { new: true },
    );
    res.json({ weeklyGoal: user.weeklyGoal });
  } catch (err) {
    res.status(500).json({ error: "Failed to update goal" });
  }
});

// 👇 NEW: Route to delete user account (VP-E09)
app.delete("/api/delete-account/:email", async (req, res) => {
  try {
    const deletedUser = await User.findOneAndDelete({
      email: req.params.email,
    });
    if (!deletedUser)
      return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "Account successfully deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete account" });
  }
});

app.post("/api/forgot-password", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(404).json({ message: "No user found." });
  const resetToken = crypto.randomBytes(32).toString("hex");
  user.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
  await user.save();
  const resetUrl = `https://volunteer-pulse-eight.vercel.app/reset-password/${resetToken}`;
  sendEmail({
    email: user.email,
    subject: "Password Reset",
    message: `Link: ${resetUrl}`,
  }).catch((err) => console.error(err));
  res.status(200).json({ message: "Token sent!" });
});

app.post("/api/reset-password/:token", async (req, res) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user) return res.status(400).json({ message: "Invalid/Expired token" });
  user.password = await bcrypt.hash(req.body.password, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  res.status(200).json({ message: "Success!" });
});

app.post(
  "/api/upload-profile-pic",
  upload.single("image"),
  async (req, res) => {
    const { email } = req.body;
    const user = await User.findOneAndUpdate(
      { email },
      { profilePic: req.file.path },
      { new: true },
    );
    res.json({ url: req.file.path });
  },
);

app.get("/api/leaderboard", async (req, res) => {
  try {
    const volunteers = await User.find(
      {},
      "name profilePic totalVolunteerMinutes linkedInUrl",
    ).sort({ totalVolunteerMinutes: -1 });
    res.json(volunteers);
  } catch (err) {
    res.status(500).json({ error: "Failed to load directory" });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`✅ Server running on ${PORT}`));
