import { useState, useEffect, useContext } from "react";
import axios from "axios";
import "./App.css";
import AuthContext, { AuthProvider } from "./AuthContext";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function VolunteerApp() {
  const { user, login, logout } = useContext(AuthContext);

  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState(999999);

  // Auth & Modal State (FULLY RESTORED)
  const [showLogin, setShowLogin] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetToken, setResetToken] = useState("");

  // Form Data State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // Status Messages
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [uploading, setUploading] = useState(false);

  // App Features State
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [viewMode, setViewMode] = useState("list");
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  const AVAILABLE_CATEGORIES = [
    "Education",
    "Environment",
    "Animals",
    "Community",
    "Tech",
  ];
  const API_URL = "https://volunteer-pulse-backend.onrender.com";

  // Check URL for reset token
  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes("/reset-password/")) {
      const token = path.split("/").pop();
      setResetToken(token);
      setIsResetMode(true);
      setShowLogin(true);
    }
  }, []);

  // Load interests on login
  useEffect(() => {
    if (user && user.interests) setSelectedInterests(user.interests);
    else setSelectedInterests([]);
  }, [user]);

  // Fetch Tasks
  useEffect(() => {
    axios
      .get(`${API_URL}/api/tasks?maxTime=${filter}`)
      .then((res) => setTasks(res.data))
      .catch((err) => console.error(err));
  }, [filter]);

  // Handlers
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
      setError(err.response?.data?.message || "Auth failed");
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
      await axios.post(`${API_URL}/api/reset-password/${resetToken}`, {
        password,
      });
      setSuccessMsg("Success! Password updated. You can now log in.");
      setIsResetMode(false);
      setResetToken("");
      window.history.pushState({}, "", "/");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired token");
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
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      const timestampedUrl = `${res.data.url}?t=${Date.now()}`;
      login({ ...user, profilePic: timestampedUrl });
      setSuccessMsg("Picture updated!");
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch (err) {
      console.error("Upload failed", err);
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const toggleInterest = (category) => {
    if (selectedInterests.includes(category)) {
      setSelectedInterests(selectedInterests.filter((c) => c !== category));
    } else {
      setSelectedInterests([...selectedInterests, category]);
    }
  };

  const saveInterests = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/update-interests`, {
        email: user.email,
        interests: selectedInterests,
      });
      login({ ...user, interests: res.data.interests });
      setSuccessMsg("Interests saved!");
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch (err) {
      console.error("Save failed");
    }
  };

  const handleSaveTask = async (taskId) => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/api/save-task`, {
        email: user.email,
        taskId,
      });
      login({ ...user, savedTasks: res.data.savedTasks });
    } catch (err) {
      console.error("Save failed", err);
    }
  };

  const handleApply = async (taskId) => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/api/apply-task`, {
        email: user.email,
        taskId,
      });
      login({ ...user, appliedTasks: res.data.appliedTasks });
    } catch (err) {
      console.error("Apply failed", err);
    }
  };

  const formatDuration = (mins) => {
    if (mins < 60) return `${mins} Mins`;
    if (mins < 1440) return `${mins / 60} Hours`;
    return `${mins / 1440} Days`;
  };

  const filteredTasks = showSavedOnly
    ? tasks.filter((t) => user?.savedTasks?.includes(t._id))
    : tasks;

  const sortedTasks = [...filteredTasks].sort((a, b) => {
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
                <img
                  src={
                    user.profilePic ||
                    `https://ui-avatars.com/api/?name=${user.name}`
                  }
                  className="profile-pic-nav"
                  alt="Profile"
                />
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

      {/* FULLY RESTORED MODAL */}
      {showLogin && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>
              {isResetMode
                ? "New Password"
                : isForgotPassword
                  ? "Reset Password"
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
                  Back to Login
                </p>
              </form>
            ) : (
              <form onSubmit={handleAuth}>
                {isRegistering && (
                  <input
                    name="name"
                    type="text"
                    placeholder="Name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                )}
                <input
                  name="email"
                  type="email"
                  placeholder="Email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  name="password"
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

            {!isResetMode && !isForgotPassword && (
              <p
                className="toggle-text"
                onClick={() => setIsRegistering(!isRegistering)}
              >
                {isRegistering ? "Back to Login" : "Need an account? Register"}
              </p>
            )}

            <button
              className="close-btn"
              onClick={() => {
                setShowLogin(false);
                setIsForgotPassword(false);
                setIsRegistering(false);
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="main-content">
        {user && (
          <div className="interests-section">
            <h3>Personalize Your Feed</h3>
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
            {successMsg === "Interests saved!" && (
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

        <div className="view-toggle">
          <button
            className={viewMode === "list" ? "active" : ""}
            onClick={() => setViewMode("list")}
          >
            📋 List
          </button>
          <button
            className={viewMode === "map" ? "active" : ""}
            onClick={() => setViewMode("map")}
          >
            🗺️ Map
          </button>

          {user && (
            <button
              className={`save-filter-btn ${showSavedOnly ? "active" : ""}`}
              onClick={() => setShowSavedOnly(!showSavedOnly)}
            >
              ❤️ {showSavedOnly ? "Showing Saved" : "Show Saved"}
            </button>
          )}
        </div>

        <div className="filter-section">
          <label>Time available:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="time-select"
          >
            <option value="15">15 Mins</option>
            <option value="60">1 Hour</option>
            <option value="999999">Show All</option>
          </select>
        </div>

        {viewMode === "list" ? (
          <div className="task-list">
            {sortedTasks.map((task) => (
              <div key={task._id} className="task-card">
                <button
                  className={`heart-btn ${user?.savedTasks?.includes(task._id) ? "saved" : ""}`}
                  onClick={() => handleSaveTask(task._id)}
                >
                  {user?.savedTasks?.includes(task._id) ? "❤️" : "🤍"}
                </button>

                {user?.interests?.includes(task.category) && (
                  <div className="recommended-badge">⭐ Recommended</div>
                )}
                <h3>{task.title}</h3>
                <p className="org-name">{task.organization}</p>
                <p className="task-address">📍 {task.address}</p>
                <span className="category-tag">{task.category}</span>
                <div className="badge-container">
                  <span className="duration-badge macro">
                    ⏱ {formatDuration(task.duration)}
                  </span>
                </div>

                <button
                  className={
                    user?.appliedTasks?.includes(task._id)
                      ? "applied-btn"
                      : "apply-btn"
                  }
                  onClick={() => handleApply(task._id)}
                >
                  {user?.appliedTasks?.includes(task._id)
                    ? "Applied ✓"
                    : "Apply Now"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="map-container-wrapper">
            <MapContainer
              center={[42.9849, -81.2453]}
              zoom={13}
              style={{ height: "500px", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {sortedTasks.map((task) => (
                <Marker key={task._id} position={[task.lat, task.lng]}>
                  <Popup>
                    <strong>{task.title}</strong>
                    <br />
                    {task.organization}
                    <br />
                    <span style={{ fontSize: "12px", color: "#666" }}>
                      {task.address}
                    </span>
                    <br />
                    <button
                      onClick={() => handleSaveTask(task._id)}
                      style={{
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        fontSize: "18px",
                      }}
                    >
                      {user?.savedTasks?.includes(task._id) ? "❤️" : "🤍"}
                    </button>
                    <button
                      className={
                        user?.appliedTasks?.includes(task._id)
                          ? "applied-btn-small"
                          : "apply-btn-small"
                      }
                      onClick={() => handleApply(task._id)}
                    >
                      {user?.appliedTasks?.includes(task._id)
                        ? "Applied ✓"
                        : "Apply Now"}
                    </button>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}
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
