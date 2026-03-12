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

  // 👇 NEW: State to hold the letters the user is typing
  const [searchQuery, setSearchQuery] = useState("");

  const [showLogin, setShowLogin] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetToken, setResetToken] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  const [newTask, setNewTask] = useState({
    title: "",
    organization: "",
    durationValue: "",
    durationUnit: "Hours",
    category: "Community",
    address: "",
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [uploading, setUploading] = useState(false);
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
    if (user && user.interests) setSelectedInterests(user.interests);
    else setSelectedInterests([]);
  }, [user]);

  const fetchTasks = () => {
    axios
      .get(`${API_URL}/api/tasks?maxTime=${filter}`)
      .then((res) => setTasks(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchTasks();
  }, [filter]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmittingTask(true);

    let totalMinutes = parseInt(newTask.durationValue);
    if (newTask.durationUnit === "Hours") totalMinutes *= 60;
    if (newTask.durationUnit === "Days") totalMinutes *= 1440;

    try {
      const geoRes = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newTask.address)}`,
      );

      let finalLat = 42.9849;
      let finalLng = -81.2453;

      if (geoRes.data && geoRes.data.length > 0) {
        finalLat = parseFloat(geoRes.data[0].lat);
        finalLng = parseFloat(geoRes.data[0].lon);
      } else {
        alert(
          "Warning: Could not pinpoint the exact address on the map. Using default city center.",
        );
      }

      const taskPayload = {
        title: newTask.title,
        organization: newTask.organization,
        duration: totalMinutes,
        category: newTask.category,
        address: newTask.address,
        lat: finalLat,
        lng: finalLng,
      };

      await axios.post(`${API_URL}/api/tasks`, taskPayload);
      setSuccessMsg("Task created successfully!");
      setShowCreateModal(false);

      setNewTask({
        title: "",
        organization: "",
        durationValue: "",
        durationUnit: "Hours",
        category: "Community",
        address: "",
      });
      fetchTasks();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError("Failed to create task.");
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await axios.delete(`${API_URL}/api/tasks/${taskId}`);
        setSuccessMsg("Task deleted!");
        fetchTasks();
        setTimeout(() => setSuccessMsg(""), 2000);
      } catch (err) {
        console.error("Failed to delete task", err);
        setError("Failed to delete task.");
      }
    }
  };

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
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const toggleInterest = (category) => {
    if (selectedInterests.includes(category))
      setSelectedInterests(selectedInterests.filter((c) => c !== category));
    else setSelectedInterests([...selectedInterests, category]);
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

  // 👇 UPDATED: The Real-Time Filtering Logic!
  const filteredTasks = tasks.filter((t) => {
    // 1. Check if it matches the "Show Saved" button
    const matchesSaved = showSavedOnly
      ? user?.savedTasks?.includes(t._id)
      : true;

    // 2. Check if the title OR organization matches what is typed in the search bar
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      t.title.toLowerCase().includes(searchLower) ||
      t.organization.toLowerCase().includes(searchLower);

    // 3. Only keep the task if it passes both checks
    return matchesSaved && matchesSearch;
  });

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
          {user && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="create-task-btn"
            >
              ＋ Post Task
            </button>
          )}
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

      {/* CREATE TASK MODAL */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Post New Opportunity</h2>
            {error && <p style={{ color: "red" }}>{error}</p>}
            <form onSubmit={handleCreateTask} className="task-form">
              <input
                type="text"
                placeholder="Task Title (e.g. Garden Help)"
                required
                value={newTask.title}
                onChange={(e) =>
                  setNewTask({ ...newTask, title: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Organization Name"
                required
                value={newTask.organization}
                onChange={(e) =>
                  setNewTask({ ...newTask, organization: e.target.value })
                }
              />

              <div className="geo-inputs">
                <input
                  type="number"
                  min="1"
                  placeholder="Amount"
                  required
                  value={newTask.durationValue}
                  onChange={(e) =>
                    setNewTask({ ...newTask, durationValue: e.target.value })
                  }
                />
                <select
                  value={newTask.durationUnit}
                  onChange={(e) =>
                    setNewTask({ ...newTask, durationUnit: e.target.value })
                  }
                >
                  <option value="Minutes">Minutes</option>
                  <option value="Hours">Hours</option>
                  <option value="Days">Days</option>
                </select>
              </div>

              <select
                value={newTask.category}
                onChange={(e) =>
                  setNewTask({ ...newTask, category: e.target.value })
                }
              >
                {AVAILABLE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Full Street Address (e.g. 300 Clarke Rd, London)"
                required
                value={newTask.address}
                onChange={(e) =>
                  setNewTask({ ...newTask, address: e.target.value })
                }
              />

              <button
                type="submit"
                className="submit-btn"
                disabled={isSubmittingTask}
              >
                {isSubmittingTask ? "Locating on Map..." : "Create Task"}
              </button>
            </form>
            <button
              className="close-btn"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* AUTH MODAL */}
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
        {successMsg && <div className="floating-success">{successMsg}</div>}

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

        {/* 👇 NEW: The Search Bar UI added inside the filter section */}
        <div className="search-filter-container">
          <input
            type="text"
            placeholder="🔍 Search tasks or organizations..."
            className="clean-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="time-filter-wrapper">
            <label>Time available:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="clean-select"
            >
              <option value="15">15 Mins</option>
              <option value="60">1 Hour</option>
              <option value="999999">Show All</option>
            </select>
          </div>
        </div>

        {viewMode === "list" ? (
          <div className="task-list">
            {sortedTasks.length === 0 && (
              <p
                style={{ textAlign: "center", width: "100%", padding: "20px" }}
              >
                No tasks found matching your search.
              </p>
            )}

            {sortedTasks.map((task) => (
              <div key={task._id} className="task-card">
                {user && (
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteTask(task._id)}
                    title="Delete Task"
                  >
                    🗑️
                  </button>
                )}

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
                    {user && (
                      <button
                        onClick={() => handleDeleteTask(task._id)}
                        style={{
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          fontSize: "18px",
                          marginLeft: "10px",
                        }}
                        title="Delete Task"
                      >
                        🗑️
                      </button>
                    )}

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
