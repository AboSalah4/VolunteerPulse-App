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

// 1. Connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected!"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// --- MODELS ---
// Task Model (👇 Added lat and lng for Map support)
const Task = mongoose.model(
  "Task",
  new mongoose.Schema({
    title: String,
    organization: String,
    duration: Number,
    category: String,
    lat: Number, // 👈 Latitude
    lng: Number, // 👈 Longitude
  }),
);

// User Model
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  profilePic: { type: String, default: "" },
  interests: { type: [String], default: [] }, 
});
const User = mongoose.model("User", UserSchema);

// --- SEED DATA ---
const seedTasks = async () => {
  // Clear the old tasks to apply the new GPS coordinates
  await Task.deleteMany({});

  await Task.insertMany([
    // Education & Tutoring
    { title: "Sort Books", organization: "Public Library", duration: 15, category: "Education", lat: 42.9850, lng: -81.2460 },
    { title: "Online Reading Tutor", organization: "Global Literacy", duration: 60, category: "Education", lat: 42.9820, lng: -81.2510 },

    // Environment
    { title: "Social Media Post", organization: "EcoGroup", duration: 15, category: "Environment", lat: 42.9800, lng: -81.2500 },
    { title: "Tree Planting Day", organization: "GreenCity", duration: 240, category: "Environment", lat: 42.9750, lng: -81.2350 },

    // Animals
    { title: "Walk Dogs", organization: "Animal Shelter", duration: 45, category: "Animals", lat: 42.9900, lng: -81.2400 },
    { title: "Cat Socialization", organization: "Kitty Haven", duration: 120, category: "Animals", lat: 42.9920, lng: -81.2450 },

    // Community
    { title: "Event Setup", organization: "Community Center", duration: 180, category: "Community", lat: 42.9860, lng: -81.2380 },
    { title: "Food Bank Sorter", organization: "Metro Food Bank", duration: 120, category: "Community", lat: 42.9810, lng: -81.2300 },

    // Tech
    { title: "Hackathon Mentor", organization: "Tech Non-Profit", duration: 1440, category: "Tech", lat: 42.9880, lng: -81.2550 },
    { title: "Website Bug Fix", organization: "Open Source Project", duration: 300, category: "Tech", lat: 42.9840, lng: -81.2600 },
    { title: "Database Cleanup", organization: "Charity Tech", duration: 43200, category: "Tech", lat: 42.9870, lng: -81.2480 }, 
  ]);
  console.log("🌱 Database seeded with Map Coordinates!");
};
mongoose.connection.once("open", seedTasks);

// --- ROUTES ---

// 1. Get Tasks
app.get("/api/tasks", async (req, res) => {
  const { maxTime } = req.query;
  const tasks = await Task.find({
    duration: { $lte: parseInt(maxTime) || 999999 },
  });
  res.json(tasks);
});

// 2. Register User
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User created successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Login User
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, "SECRET_KEY_123", {
      expiresIn: "1h",
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic,
        interests: user.interests,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update Interests Route 
app.post("/api/update-interests", async (req, res) => {
  try {
    const { email, interests } = req.body;
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { interests: interests },
      { new: true },
    );

    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });
    res.status(200).json({
      message: "Interests saved successfully!",
      interests: updatedUser.interests,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to save interests" });
  }
});

// 5. Forgot Password
app.post("/api/forgot-password", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user)
      return res
        .status(404)
        .json({ message: "There is no user with that email address." });

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const resetUrl = `https://volunteer-pulse-eight.vercel.app/reset-password/${resetToken}`;
    const message = `You requested a password reset for VolunteerPulse.\nPlease click this link to reset your password:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`;

    try {
      await sendEmail({
        email: user.email,
        subject: "VolunteerPulse - Password Reset Token",
        message: message,
      });
      res.status(200).json({ message: "Reset token sent to email!" });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      return res.status(500).json({
        message: "There was an error sending the email. Try again later.",
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Reset Password
app.post("/api/reset-password/:token", async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user)
      return res
        .status(400)
        .json({ message: "Token is invalid or has expired." });

    user.password = await bcrypt.hash(req.body.password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res
      .status(200)
      .json({ message: "Password reset successful! You can now log in." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Upload Profile Picture Route
app.post(
  "/api/upload-profile-pic",
  upload.single("image"),
  async (req, res) => {
    try {
      const { email } = req.body;
      const imageUrl = req.file.path;
      const updatedUser = await User.findOneAndUpdate(
        { email },
        { profilePic: imageUrl },
        { new: true },
      );
      if (!updatedUser)
        return res.status(404).json({ message: "User not found" });

      res
        .status(200)
        .json({ message: "Image uploaded successfully!", url: imageUrl });
    } catch (error) {
      console.error("Upload Error:", error);
      res.status(500).json({ message: "Upload failed" });
    }
  },
);

const PORT = process.env.PORT || 5001;

app.get("/", (req, res) => {
  res.status(200).send("VolunteerPulse Server is Healthy and Awake!");
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});