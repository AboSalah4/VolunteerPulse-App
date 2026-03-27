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
app.use('/api/applications', applicationRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected!"))
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
  applicants: [
    {
      userId: String,
      userName: String,
      userEmail: String,
      status: { type: String, default: "Pending" },
    },
  ],
});
const Task = mongoose.model("Task", TaskSchema);

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  profilePic: { type: String, default: "" },
  interests: { type: [String], default: [] },
  appliedTasks: [{ type: String }],
  savedTasks: [{ type: String }],
  totalVolunteerMinutes: { type: Number, default: 0 },
});
const User = mongoose.model("User", UserSchema);

// --- SEED DATA ---
const seedTasks = async () => {
  const count = await Task.countDocuments();
  if (count > 0) return;
  await Task.insertMany([
    {
      title: "Sort Books",
      organization: "Public Library",
      duration: 15,
      category: "Education",
      lat: 42.985,
      lng: -81.246,
      address: "251 Dundas St, London, ON",
      createdBy: "admin@volunteerpulse.com",
    },
    {
      title: "Walk Dogs",
      organization: "Animal Shelter",
      duration: 45,
      category: "Animals",
      lat: 42.99,
      lng: -81.24,
      address: "624 Clarke Rd, London, ON",
      createdBy: "admin@volunteerpulse.com",
    },
  ]);
  console.log("🌱 Database seeded!");
};
mongoose.connection.once("open", seedTasks);

// --- TASK & APPLICATION ROUTES ---

app.post("/api/tasks", async (req, res) => {
  try {
    const newTask = new Task(req.body);
    await newTask.save();
    res.status(201).json(newTask);
  } catch (err) {
    res.status(500).json({ error: "Failed to create task" });
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
          updatedPoints = student.totalVolunteerMinutes; // 👇 NEW: Track the exact updated points
        }
      }

      applicant.status = status;
      await task.save();

      await sendEmail({
        email: applicant.userEmail,
        subject: `Update: ${task.title}`,
        message: `Your application for "${task.title}" is now ${status.toLowerCase()}.`,
      });
    }
    // 👇 NEW: Send the new points back to the frontend
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

app.get("/api/tasks", async (req, res) => {
  const { maxTime } = req.query;
  const tasks = await Task.find({
    duration: { $lte: parseInt(maxTime) || 999999 },
  });
  res.json(tasks);
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

// --- USER & AUTH ROUTES ---

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
        profilePic: user.profilePic,
        interests: user.interests,
        appliedTasks: user.appliedTasks,
        savedTasks: user.savedTasks,
        totalVolunteerMinutes: user.totalVolunteerMinutes || 0,
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
  await sendEmail({
    email: user.email,
    subject: "Password Reset",
    message: `Link: ${resetUrl}`,
  });
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

app.get("/", (req, res) =>
  res.status(200).send("VolunteerPulse Server is Healthy and Awake!"),
);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`✅ Server on ${PORT}`));
