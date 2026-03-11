const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
require("dotenv").config();

const sendEmail = require("./sendEmail");
const { upload } = require("./cloudinaryConfig");

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected!"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// --- MODELS ---
const Task = mongoose.model(
  "Task",
  new mongoose.Schema({
    title: String,
    organization: String,
    duration: Number,
    category: String,
    lat: Number,
    lng: Number,
    address: String,
  }),
);

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  profilePic: { type: String, default: "" },
  interests: { type: [String], default: [] },
  appliedTasks: [{ type: String }], // Storing IDs as strings for easier frontend matching
});
const User = mongoose.model("User", UserSchema);

// --- SEED DATA ---
const seedTasks = async () => {
  await Task.deleteMany({}); // Clears old "No Address" tasks
  await Task.insertMany([
    {
      title: "Sort Books",
      organization: "Public Library",
      duration: 15,
      category: "Education",
      lat: 42.985,
      lng: -81.246,
      address: "251 Dundas St, London, ON",
    },
    {
      title: "Online Reading Tutor",
      organization: "Global Literacy",
      duration: 60,
      category: "Education",
      lat: 42.982,
      lng: -81.251,
      address: "167 Central Ave, London, ON",
    },
    {
      title: "Social Media Post",
      organization: "EcoGroup",
      duration: 15,
      category: "Environment",
      lat: 42.98,
      lng: -81.25,
      address: "1017 Western Rd, London, ON",
    },
    {
      title: "Tree Planting Day",
      organization: "GreenCity",
      duration: 240,
      category: "Environment",
      lat: 42.975,
      lng: -81.235,
      address: "1001 Fanshawe College Blvd, London, ON",
    },
    {
      title: "Walk Dogs",
      organization: "Animal Shelter",
      duration: 45,
      category: "Animals",
      lat: 42.99,
      lng: -81.24,
      address: "624 Clarke Rd, London, ON",
    },
    {
      title: "Cat Socialization",
      organization: "Kitty Haven",
      duration: 120,
      category: "Animals",
      lat: 42.992,
      lng: -81.245,
      address: "121 Pine Valley Blvd, London, ON",
    },
    {
      title: "Event Setup",
      organization: "Community Center",
      duration: 180,
      category: "Community",
      lat: 42.986,
      lng: -81.238,
      address: "1119 Jalna Blvd, London, ON",
    },
    {
      title: "Food Bank Sorter",
      organization: "Metro Food Bank",
      duration: 120,
      category: "Community",
      lat: 42.981,
      lng: -81.23,
      address: "926 Leathorne St, London, ON",
    },
    {
      title: "Hackathon Mentor",
      organization: "Tech Non-Profit",
      duration: 1440,
      category: "Tech",
      lat: 42.988,
      lng: -81.255,
      address: "150 Dufferin Ave, London, ON",
    },
    {
      title: "Website Bug Fix",
      organization: "Open Source Project",
      duration: 300,
      category: "Tech",
      lat: 42.984,
      lng: -81.26,
      address: "137 Dundas St, London, ON",
    },
    {
      title: "Database Cleanup",
      organization: "Charity Tech",
      duration: 43200,
      category: "Tech",
      lat: 42.987,
      lng: -81.248,
      address: "450 Ridout St N, London, ON",
    },
  ]);
  console.log("🌱 Database seeded with New Addresses!");
};
mongoose.connection.once("open", seedTasks);

// --- ROUTES ---
app.get("/api/tasks", async (req, res) => {
  const { maxTime } = req.query;
  const tasks = await Task.find({
    duration: { $lte: parseInt(maxTime) || 999999 },
  });
  res.json(tasks);
});

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: "User created!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

app.post("/api/apply-task", async (req, res) => {
  const { email, taskId } = req.body;
  const user = await User.findOne({ email });
  if (!user.appliedTasks.includes(taskId)) {
    user.appliedTasks.push(taskId);
    await user.save();
  }
  res.json({ appliedTasks: user.appliedTasks });
});

// Forgot/Reset/Upload routes remain here as previously written...
app.post("/api/forgot-password", async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`✅ Server on ${PORT}`));
