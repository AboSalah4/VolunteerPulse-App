const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
require("dotenv").config();

const sendEmail = require("./sendEmail");

const app = express();
app.use(cors());
app.use(express.json());

// 1. Connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected!"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// --- MODELS ---
// Task Model
const Task = mongoose.model(
  "Task",
  new mongoose.Schema({
    title: String,
    organization: String,
    duration: Number,
  }),
);

// User Model
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
});
const User = mongoose.model("User", UserSchema);

// --- SEED DATA ---
const seedTasks = async () => {
  const count = await Task.countDocuments();
  if (count === 0) {
    await Task.insertMany([
      { title: "Sort Books", organization: "Public Library", duration: 15 },
      { title: "Social Media Post", organization: "EcoGroup", duration: 15 },
      { title: "Walk Dogs", organization: "Animal Shelter", duration: 45 },
      { title: "Event Setup", organization: "Community Center", duration: 180 },
      {
        title: "Hackathon Mentor",
        organization: "Tech Non-Profit",
        duration: 1440,
      },
    ]);
    console.log("🌱 Database seeded!");
  }
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
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Forgot Password
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

    // UPDATED FOR PRODUCTION: Points to your Vercel App
    // Ensure this points to your LIVE Vercel app
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
      // 👇 THIS IS THE NEW TRAP TO CATCH THE SILENT ERROR 👇
      console.error("🔴 EMAIL ERROR DETAILS:", err);

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

// 5. Reset Password
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

const PORT = process.env.PORT || 5001;

app.get("/", (req, res) => {
  res.status(200).send("VolunteerPulse Server is Healthy and Awake!");
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
