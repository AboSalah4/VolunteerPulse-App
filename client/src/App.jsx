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
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [viewMode, setViewMode] = useState("list");

  const AVAILABLE_CATEGORIES = [
    "Education",
    "Environment",
    "Animals",
    "Community",
    "Tech",
  ];
  const API_URL = "https://volunteer-pulse-backend.onrender.com";

  useEffect(() => {
    if (user && user.interests) setSelectedInterests(user.interests);
    else setSelectedInterests([]);
  }, [user]);

  useEffect(() => {
    axios
      .get(`${API_URL}/api/tasks?maxTime=${filter}`)
      .then((res) => setTasks(res.data))
      .catch((err) => console.error(err));
  }, [filter]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
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

  // 👈 NEW: Real Application Logic
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
      setSuccessMsg("Application submitted!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError("Failed to apply.");
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
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError("Failed to save.");
    }
  };

  const formatDuration = (mins) => {
    if (mins < 60) return `${mins} Mins`;
    if (mins < 1440) return `${mins / 60} Hours`;
    return `${mins / 1440} Days`;
  };

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
                <img
                  src={
                    user.profilePic ||
                    `https://ui-avatars.com/api/?name=${user.name}`
                  }
                  className="profile-pic-nav"
                  alt="Profile"
                />
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

      {/* LOGIN MODAL (Skipped for brevity, keep your existing logic) */}

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
            {successMsg && (
              <span className="success-inline">✓ {successMsg}</span>
            )}
          </div>
        )}

        <div className="view-toggle">
          <button
            className={viewMode === "list" ? "active" : ""}
            onClick={() => setViewMode("list")}
          >
            📋 List View
          </button>
          <button
            className={viewMode === "map" ? "active" : ""}
            onClick={() => setViewMode("map")}
          >
            🗺️ Map View
          </button>
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
                {user?.interests?.includes(task.category) && (
                  <div className="recommended-badge">⭐ Recommended</div>
                )}
                <h3>{task.title}</h3>
                <p className="org-name">{task.organization}</p>
                {/* 👈 NEW: Address Display */}
                <p className="task-address">
                  📍 {task.address || "Location TBD"}
                </p>
                <span className="category-tag">{task.category}</span>
                <div className="badge-container">
                  <span className="duration-badge macro">
                    ⏱ {formatDuration(task.duration)}
                  </span>
                </div>

                {/* 👈 NEW: Application Toggle Button */}
                <button
                  className={
                    user?.appliedTasks?.includes(task._id)
                      ? "applied-btn"
                      : "apply-btn"
                  }
                  onClick={() => handleApply(task._id)}
                  disabled={user?.appliedTasks?.includes(task._id)}
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
                    {/* 👈 NEW: Address in Popup */}
                    <span style={{ fontSize: "12px", color: "#666" }}>
                      {task.address}
                    </span>
                    <br />
                    <button
                      className={
                        user?.appliedTasks?.includes(task._id)
                          ? "applied-btn-small"
                          : "apply-btn-small"
                      }
                      onClick={() => handleApply(task._id)}
                      disabled={user?.appliedTasks?.includes(task._id)}
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
