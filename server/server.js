const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

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

// User Model (NEW)
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
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

// 1. Get Tasks (Public)
app.get("/api/tasks", async (req, res) => {
  const { maxTime } = req.query;
  const tasks = await Task.find({
    duration: { $lte: parseInt(maxTime) || 999999 },
  });
  res.json(tasks);
});

// 2. Register User (NEW)
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    // Hash password (encrypt it)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User created successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Login User (NEW)
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    // Create Token (ID Card)
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

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
