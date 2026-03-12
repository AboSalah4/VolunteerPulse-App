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
  const [myCreatedTasks, setMyCreatedTasks] = useState([]);
  const [filter, setFilter] = useState(999999);
  const [searchQuery, setSearchQuery] = useState("");

  const [showLogin, setShowLogin] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetToken, setResetToken] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // list, map, manage, or applied
  const [showSavedOnly, setShowSavedOnly] = useState(false);

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

  const fetchMyTasks = () => {
    if (!user) return;
    axios
      .get(`${API_URL}/api/my-tasks/${user.email}`)
      .then((res) => setMyCreatedTasks(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchTasks();
    if (viewMode === "manage") fetchMyTasks();
  }, [filter, viewMode, user]);

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
      }

      const taskPayload = {
        ...newTask,
        duration: totalMinutes,
        lat: finalLat,
        lng: finalLng,
        createdBy: user.email,
      };
      await axios.post(`${API_URL}/api/tasks`, taskPayload);
      setSuccessMsg("Task posted!");
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
      if (viewMode === "manage") fetchMyTasks();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError("Failed to create task.");
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleUpdateStatus = async (taskId, userId, status) => {
    try {
      await axios.post(`${API_URL}/api/update-status`, {
        taskId,
        userId,
        status,
      });
      setSuccessMsg(`Applicant ${status}!`);
      fetchMyTasks();
      fetchTasks(); // Refresh global list for student view updates
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch (err) {
      console.error("Status update failed");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm("Delete this task?")) {
      try {
        await axios.delete(`${API_URL}/api/tasks/${taskId}`);
        setSuccessMsg("Deleted!");
        fetchTasks();
        fetchMyTasks();
        setTimeout(() => setSuccessMsg(""), 2000);
      } catch (err) {
        setError("Delete failed.");
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
        setSuccessMsg("Registered! Please login.");
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
      setError("Error sending link");
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
      setSuccessMsg("Password updated!");
      setIsResetMode(false);
      setResetToken("");
      window.history.pushState({}, "", "/");
    } catch (err) {
      setError("Invalid/Expired token");
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
      login({ ...user, profilePic: res.data.url });
      setSuccessMsg("Picture updated!");
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch (err) {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const toggleInterest = (category) => {
    const newInterests = selectedInterests.includes(category)
      ? selectedInterests.filter((c) => c !== category)
      : [...selectedInterests, category];
    setSelectedInterests(newInterests);
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
      fetchTasks();
    } catch (err) {
      console.error("Apply failed", err);
    }
  };

  const formatDuration = (mins) => {
    if (mins < 60) return `${mins} Mins`;
    if (mins < 1440) return `${Math.floor(mins / 60)} Hours`;
    return `${Math.floor(mins / 1440)} Days`;
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSaved = showSavedOnly
      ? user?.savedTasks?.includes(t._id)
      : true;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      t.title.toLowerCase().includes(searchLower) ||
      t.organization.toLowerCase().includes(searchLower);
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
                  {uploading ? "..." : "📷"}
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

      {/* MODALS */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Post New Opportunity</h2>
            <form onSubmit={handleCreateTask} className="task-form">
              <input
                type="text"
                placeholder="Title"
                required
                value={newTask.title}
                onChange={(e) =>
                  setNewTask({ ...newTask, title: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Organization"
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
                placeholder="Full Street Address"
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
                {isSubmittingTask ? "Processing..." : "Create Task"}
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
            <p
              className="toggle-text"
              onClick={() => setIsRegistering(!isRegistering)}
            >
              {isRegistering ? "Back to Login" : "Need an account? Register"}
            </p>
            <button className="close-btn" onClick={() => setShowLogin(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
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
              className={viewMode === "applied" ? "active" : ""}
              onClick={() => setViewMode("applied")}
            >
              ✍️ My Apps
            </button>
          )}
          {user && (
            <button
              className={viewMode === "manage" ? "active" : ""}
              onClick={() => setViewMode("manage")}
            >
              ⚙️ Manage
            </button>
          )}
          {user && (
            <button
              className={`save-filter-btn ${showSavedOnly ? "active" : ""}`}
              onClick={() => setShowSavedOnly(!showSavedOnly)}
            >
              ❤️ {showSavedOnly ? "Showing Saved" : "Show Saved"}
            </button>
          )}
        </div>

        {viewMode === "applied" ? (
          <div className="applied-section">
            <h2>My Volunteering Applications</h2>
            {tasks.filter((t) => user?.appliedTasks?.includes(t._id)).length ===
              0 && <p>No applications yet.</p>}
            <div className="task-list">
              {tasks
                .filter((t) => user?.appliedTasks?.includes(t._id))
                .map((task) => {
                  const application = task.applicants?.find(
                    (a) => a.userEmail === user.email,
                  );
                  const status = application?.status || "Pending";
                  return (
                    <div key={task._id} className="task-card">
                      <div className={`status-banner ${status.toLowerCase()}`}>
                        {status}
                      </div>
                      <h3>{task.title}</h3>
                      <p className="org-name">{task.organization}</p>
                      <button
                        className="applied-btn"
                        onClick={() => handleApply(task._id)}
                      >
                        Withdraw
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : viewMode === "manage" ? (
          <div className="manage-section">
            <h2>Management Dashboard</h2>
            <div className="task-grid">
              {myCreatedTasks.map((task) => (
                <div key={task._id} className="manage-card">
                  <h3>{task.title}</h3>
                  <div className="applicant-list">
                    {task.applicants.map((app) => (
                      <div key={app.userId} className="applicant-row">
                        <span>
                          {app.userName} ({app.status})
                        </span>
                        <div className="action-btns">
                          <button
                            onClick={() =>
                              handleUpdateStatus(
                                task._id,
                                app.userId,
                                "Accepted",
                              )
                            }
                          >
                            ✅
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateStatus(
                                task._id,
                                app.userId,
                                "Declined",
                              )
                            }
                          >
                            ❌
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="delete-task-btn"
                    onClick={() => handleDeleteTask(task._id)}
                  >
                    Delete Task
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="search-filter-container">
              <input
                type="text"
                placeholder="Search tasks or organizations..."
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
          </>
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
