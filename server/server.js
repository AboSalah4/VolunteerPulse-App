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
    address: String, // 👈 NEW: Physical address field
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
  appliedTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }], // 👈 NEW: Track user applications
});
const User = mongoose.model("User", UserSchema);

// --- SEED DATA (Updated with real London, ON addresses) ---
const seedTasks = async () => {
  await Task.deleteMany({});

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
  console.log("🌱 Database seeded with Addresses and GPS!");
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
        appliedTasks: user.appliedTasks, // 👈 Send applied tasks on login
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 👈 NEW ROUTE: Apply for a task
app.post("/api/apply-task", async (req, res) => {
  try {
    const { email, taskId } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.appliedTasks.includes(taskId)) {
      user.appliedTasks.push(taskId);
      await user.save();
    }
    res
      .status(200)
      .json({
        message: "Applied successfully!",
        appliedTasks: user.appliedTasks,
      });
  } catch (error) {
    res.status(500).json({ message: "Application failed" });
  }
});

// ... (Other routes: register, update-interests, forgot-password, reset-password, upload-profile-pic stay the same)

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
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
