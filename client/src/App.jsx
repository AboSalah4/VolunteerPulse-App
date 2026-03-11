import { useState, useEffect, useContext } from "react";
import axios from "axios";
import "./App.css";
import AuthContext, { AuthProvider } from "./AuthContext";

function VolunteerApp() {
  const { user, login, logout } = useContext(AuthContext);

  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState(999999);
  const [showLogin, setShowLogin] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const [resetToken, setResetToken] = useState("");
  const [isResetMode, setIsResetMode] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [uploading, setUploading] = useState(false);

  // 👇 NEW: State for tracking which interests the user clicks
  const [selectedInterests, setSelectedInterests] = useState([]);

  // These match the categories we just seeded in the database
  const AVAILABLE_CATEGORIES = [
    "Education",
    "Environment",
    "Animals",
    "Community",
    "Tech",
  ];

  const API_URL = "https://volunteer-pulse-backend.onrender.com";

  // When a user logs in, load their previously saved interests into the UI
  useEffect(() => {
    if (user && user.interests) {
      setSelectedInterests(user.interests);
    } else {
      setSelectedInterests([]);
    }
  }, [user]);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes("/reset-password/")) {
      const token = path.split("/").pop();
      setResetToken(token);
      setIsResetMode(true);
      setShowLogin(true);
    }
  }, []);

  useEffect(() => {
    axios
      .get(`${API_URL}/api/tasks?maxTime=${filter}`)
      .then((res) => setTasks(res.data))
      .catch((err) => console.error(err));
  }, [filter]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    const endpoint = isRegistering ? "/api/register" : "/api/login";
    try {
      const res = await axios.post(
        `${API_URL}${endpoint}`,
        isRegistering ? { name, email, password } : { email, password },
      );
      if (isRegistering) {
        setIsRegistering(false);
        setSuccessMsg("Account created! Please log in.");
      } else {
        login(res.data.user);
        setShowLogin(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred");
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("email", user.email);
    formData.append("image", file);

    setUploading(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/upload-profile-pic`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      const cleanUrl = res.data.url;
      const timestampedUrl = `${cleanUrl}?t=${Date.now()}`;

      login({ ...user, profilePic: timestampedUrl });
      setSuccessMsg("Profile picture updated!");
    } catch (err) {
      console.error("Upload error", err);
      setError("Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  // 👇 NEW: Toggle interest button logic
  const toggleInterest = (category) => {
    if (selectedInterests.includes(category)) {
      setSelectedInterests(selectedInterests.filter((c) => c !== category));
    } else {
      setSelectedInterests([...selectedInterests, category]);
    }
  };

  // 👇 NEW: Save interests to database
  const saveInterests = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/update-interests`, {
        email: user.email,
        interests: selectedInterests,
      });
      // Update the user context so the app knows about the new interests immediately
      login({ ...user, interests: res.data.interests });
      setSuccessMsg("Interests saved successfully!");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError("Failed to save interests.");
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    try {
      const res = await axios.post(`${API_URL}/api/forgot-password`, { email });
      setSuccessMsg(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Error sending reset link");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    try {
      const res = await axios.post(
        `${API_URL}/api/reset-password/${resetToken}`,
        { password },
      );
      setSuccessMsg("Success! Password updated. You can now log in.");
      setIsResetMode(false);
      setResetToken("");
      window.history.pushState({}, "", "/");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired token");
    }
  };

  const formatDuration = (mins) => {
    if (mins < 60) return `${mins} Mins`;
    if (mins < 1440) return `${mins / 60} Hours`;
    return `${mins / 1440} Days`;
  };

  // 👇 NEW: Smart Sorting Logic
  // This takes the tasks and sorts them so matches appear at the top
  const sortedTasks = [...tasks].sort((a, b) => {
    const aMatch = user?.interests?.includes(a.category) ? 1 : 0;
    const bMatch = user?.interests?.includes(b.category) ? 1 : 0;
    return bMatch - aMatch;
  });

  return (
    <div className="container">
      <header className="app-header">
        <div className="header-left">
          <h1>VolunteerPulse</h1>
        </div>
        <div className="header-center">
          {user && (
            <div className="user-profile-header">
              <div className="profile-pic-container">
                {user.profilePic ? (
                  <img
                    src={user.profilePic}
                    alt="Profile"
                    className="profile-pic-nav"
                    onError={(e) => {
                      e.target.src =
                        "https://ui-avatars.com/api/?name=" + user.name;
                    }}
                  />
                ) : (
                  <img
                    src={`https://ui-avatars.com/api/?name=${user.name}&background=random`}
                    className="profile-pic-nav"
                    alt="Avatar"
                  />
                )}
                <label className="upload-label">
                  {uploading ? (
                    "..."
                  ) : (
                    <svg viewBox="0 0 512 512" width="12px" height="12px">
                      <path d="M512 144v288c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V144c0-26.5 21.5-48 48-48h88l12.3-32.9c7-18.6 24.8-31.1 44.8-31.1h131.8c20 0 37.8 12.5 44.8 31.1L376 96h88c26.5 0 48 21.5 48 48zM256 160c-70.7 0-128 57.3-128 128s57.3 128 128 128s128-57.3 128-128s-57.3-128-128-128zm0 192c-35.3 0-64-28.7-64-64s28.7-64 64-64s64 28.7 64 64s-28.7 64-64 64z" />
                    </svg>
                  )}
                  <input
                    type="file"
                    onChange={handleImageUpload}
                    hidden
                    accept="image/*"
                  />
                </label>
              </div>
              <span>
                Welcome, <strong>{user.name}</strong>!
              </span>
            </div>
          )}
        </div>
        <div className="header-right">
          {user ? (
            <button onClick={logout} className="logout-btn">
              Logout
            </button>
          ) : (
            <button onClick={() => setShowLogin(true)} className="login-btn">
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* MODALS */}
      {showLogin && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>
              {isResetMode
                ? "New Password"
                : isForgotPassword
                  ? "Reset"
                  : isRegistering
                    ? "Register"
                    : "Login"}
            </h2>
            {error && <p style={{ color: "red" }}>{error}</p>}
            {successMsg && (
              <p style={{ color: "green", marginBottom: "10px" }}>
                {successMsg}
              </p>
            )}

            {isResetMode ? (
              <form onSubmit={handleResetPassword}>
                <input
                  type="password"
                  placeholder="New Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="submit" className="submit-btn">
                  Update
                </button>
              </form>
            ) : isForgotPassword ? (
              <form onSubmit={handleForgotPassword}>
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button type="submit" className="submit-btn">
                  Send Link
                </button>
                <p
                  className="toggle-text"
                  onClick={() => setIsForgotPassword(false)}
                >
                  Back
                </p>
              </form>
            ) : (
              <form onSubmit={handleAuth}>
                {isRegistering && (
                  <input
                    type="text"
                    placeholder="Name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                )}
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="submit" className="submit-btn">
                  {isRegistering ? "Sign Up" : "Log In"}
                </button>
                {!isRegistering && (
                  <p
                    className="toggle-text"
                    onClick={() => setIsForgotPassword(true)}
                  >
                    Forgot Password?
                  </p>
                )}
              </form>
            )}
            <button className="close-btn" onClick={() => setShowLogin(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      <div className="main-content">
        {/* 👇 NEW: Interests Selector UI (Only visible to logged-in users) 👇 */}
        {user && (
          <div className="interests-section">
            <h3>Personalize Your Feed</h3>
            <p>Select causes you care about to see recommended tasks first:</p>
            <div className="chips-container">
              {AVAILABLE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`interest-chip ${selectedInterests.includes(cat) ? "active" : ""}`}
                  onClick={() => toggleInterest(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <button className="save-interests-btn" onClick={saveInterests}>
              Save Interests
            </button>
            {successMsg === "Interests saved successfully!" && (
              <span
                style={{
                  color: "green",
                  marginLeft: "10px",
                  fontWeight: "bold",
                }}
              >
                ✓ Saved!
              </span>
            )}
          </div>
        )}

        <div className="filter-section">
          <label>I have available time:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="time-select"
          >
            <option value="15">15 Minutes</option>
            <option value="60">1 Hour</option>
            <option value="999999">Show Everything</option>
          </select>
        </div>

        <div className="task-list">
          {/* 👇 We now map over sortedTasks instead of just tasks 👇 */}
          {sortedTasks.map((task) => (
            <div key={task._id} className="task-card">
              {/* 👇 Adds a ⭐ if the task matches the user's interests 👇 */}
              {user?.interests?.includes(task.category) && (
                <div className="recommended-badge">⭐ Recommended Match</div>
              )}

              <h3>{task.title}</h3>
              <p className="org-name">{task.organization}</p>

              {/* Shows the category tag */}
              <span className="category-tag">{task.category}</span>

              <div className="badge-container">
                <span className="duration-badge macro">
                  ⏱ {formatDuration(task.duration)}
                </span>
              </div>
              <button
                onClick={() => alert(user ? `Applied!` : "Log In first!")}
              >
                {user ? "Apply Now" : "Log In to Apply"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <VolunteerApp />
    </AuthProvider>
  );
}
