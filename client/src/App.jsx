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

const Icons = {
  Camera: () => (
    <svg className="svg-icon" viewBox="0 0 24 24">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
      <circle cx="12" cy="13" r="4"></circle>
    </svg>
  ),
  List: () => (
    <svg className="svg-icon" viewBox="0 0 24 24">
      <line x1="8" y1="6" x2="21" y2="6"></line>
      <line x1="8" y1="12" x2="21" y2="12"></line>
      <line x1="8" y1="18" x2="21" y2="18"></line>
      <line x1="3" y1="6" x2="3.01" y2="6"></line>
      <line x1="3" y1="12" x2="3.01" y2="12"></line>
      <line x1="3" y1="18" x2="3.01" y2="18"></line>
    </svg>
  ),
  Map: () => (
    <svg className="svg-icon" viewBox="0 0 24 24">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
      <line x1="9" y1="3" x2="9" y2="18"></line>
      <line x1="15" y1="6" x2="15" y2="21"></line>
    </svg>
  ),
  FileCheck: () => (
    <svg className="svg-icon" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <polyline points="9 15 11 17 15 13"></polyline>
    </svg>
  ),
  Settings: () => (
    <svg className="svg-icon" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1-2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  ),
  Heart: ({ filled }) => (
    <svg
      className="svg-icon"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
  ),
  MapPin: () => (
    <svg className="svg-icon" viewBox="0 0 24 24">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3"></circle>
    </svg>
  ),
  Clock: () => (
    <svg className="svg-icon" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  ),
  Trash: () => (
    <svg className="svg-icon" viewBox="0 0 24 24">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  ),
  Plus: () => (
    <svg className="svg-icon" viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  ),
  Edit: () => (
    <svg className="svg-icon" viewBox="0 0 24 24">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  ),
  Star: () => (
    <svg
      className="svg-icon"
      viewBox="0 0 24 24"
      fill="#eab308"
      stroke="#eab308"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
  ),
  LinkedIn: () => (
    <svg className="svg-icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  ),
};

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  // 👇 VP-E06 LinkedIn State
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);

  const [newTask, setNewTask] = useState({
    title: "",
    organization: "",
    durationValue: "",
    durationUnit: "Hours",
    category: "Community",
    address: "",
  });

  const [currentEditTask, setCurrentEditTask] = useState(null);

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
    if (user) {
      setSelectedInterests(user.interests || []);
      setLinkedInUrl(user.linkedInUrl || ""); // VP-E06
    } else {
      setSelectedInterests([]);
    }
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

  const fetchLeaderboard = () => {
    axios
      .get(`${API_URL}/api/leaderboard`)
      .then((res) => setLeaderboard(res.data))
      .catch((err) => console.error("Leaderboard error:", err));
  };

  useEffect(() => {
    fetchTasks();
    if (viewMode === "manage") fetchMyTasks();
    if (viewMode === "leaderboard") fetchLeaderboard();
  }, [filter, viewMode, user]);

  const handleSaveLinkedIn = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/update-linkedin`, {
        email: user.email,
        linkedInUrl,
      });
      login({ ...user, linkedInUrl: res.data.linkedInUrl });
      setSuccessMsg("LinkedIn Profile Linked!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError("Failed to link LinkedIn");
    }
  };

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
      let finalLat = 42.9849,
        finalLng = -81.2453;
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

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmittingTask(true);

    let totalMinutes = parseInt(currentEditTask.durationValue);
    if (currentEditTask.durationUnit === "Hours") totalMinutes *= 60;
    if (currentEditTask.durationUnit === "Days") totalMinutes *= 1440;

    try {
      const taskPayload = { ...currentEditTask, duration: totalMinutes };
      await axios.put(
        `${API_URL}/api/tasks/${currentEditTask._id}`,
        taskPayload,
      );
      setSuccessMsg("Task updated!");
      setShowEditModal(false);
      fetchTasks();
      if (viewMode === "manage") fetchMyTasks();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError("Failed to update task.");
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const openEditModal = (task) => {
    let val = task.duration;
    let unit = "Minutes";
    if (val % 1440 === 0) {
      val /= 1440;
      unit = "Days";
    } else if (val % 60 === 0) {
      val /= 60;
      unit = "Hours";
    }

    setCurrentEditTask({
      ...task,
      durationValue: val,
      durationUnit: unit,
    });
    setShowEditModal(true);
  };

  const handleUpdateStatus = async (taskId, userId, status) => {
    try {
      const res = await axios.post(`${API_URL}/api/update-status`, {
        taskId,
        userId,
        status,
      });
      setSuccessMsg(
        status === "Completed"
          ? "Task verified and points awarded!"
          : `Applicant ${status}!`,
      );

      if (
        res.data.updatedPoints !== undefined &&
        res.data.verifiedUserId === user.id
      ) {
        login({ ...user, totalVolunteerMinutes: res.data.updatedPoints });
      }

      fetchMyTasks();
      fetchTasks();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Status update failed");
    }
  };

  const handleFlag = async (taskId, userId) => {
    const reason = prompt(
      "Please enter the reason for flagging this report as dishonest:",
    );
    if (!reason) return;

    try {
      const res = await axios.post(`${API_URL}/api/flag-application`, {
        taskId,
        userId,
        reason,
      });
      setSuccessMsg("Application successfully flagged for review!");

      if (res.data.updatedPoints !== undefined && userId === user.id) {
        login({ ...user, totalVolunteerMinutes: res.data.updatedPoints });
      }

      fetchMyTasks();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Error flagging:", err);
      setError("Failed to flag application.");
      setTimeout(() => setError(""), 3000);
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
      setShowLogin(false);
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

  const getPulseData = (mins) => {
    const hours = Math.floor((mins || 0) / 60);
    if (hours >= 720)
      return { icon: "🏆", title: "Gold Level", css: "badge-gold" };
    if (hours >= 50)
      return { icon: "🥈", title: "Silver Level", css: "badge-silver" };
    if (hours >= 10)
      return { icon: "🥉", title: "Bronze Level", css: "badge-bronze" };
    return { icon: "🌱", title: "Rising Star", css: "badge-starter" };
  };

  const pulseData = user ? getPulseData(user.totalVolunteerMinutes) : null;
  const totalMins = user?.totalVolunteerMinutes || 0;

  const d = Math.floor(totalMins / 1440);
  const h = Math.floor((totalMins % 1440) / 60);
  const m = totalMins % 60;

  let displayTime = "";
  if (d > 0) displayTime += `${d}d `;
  if (h > 0 || d > 0) displayTime += `${h}h `;
  displayTime += `${m}m`;

  return (
    <div className="container">
      <header className="app-header">
        <div className="header-left">
          <div className="logo-container">
            <img src="/favicon.svg" alt="Pulse Logo" className="header-logo" />
            <h1>VolunteerPulse</h1>
          </div>
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
                  {uploading ? "..." : <Icons.Camera />}
                  <input
                    type="file"
                    onChange={handleImageUpload}
                    hidden
                    accept="image/*"
                  />
                </label>
              </div>
              <div className="user-stats">
                <span className="welcome-text">
                  Welcome, <strong>{user.name}</strong>!
                </span>
                {pulseData && (
                  <div
                    className={`pulse-badge ${pulseData.css}`}
                    title={`${user.totalVolunteerMinutes || 0} Total Minutes Volunteered`}
                  >
                    <span className="badge-icon">{pulseData.icon}</span>
                    <span className="badge-time">{displayTime}</span>
                    <span className="badge-title">({pulseData.title})</span>
                  </div>
                )}
                {/* 👇 VP-E06: LinkedIn Link Feature */}
                <div className="linkedin-input-wrapper">
                  <input
                    type="text"
                    placeholder="LinkedIn Profile URL..."
                    value={linkedInUrl}
                    onChange={(e) => setLinkedInUrl(e.target.value)}
                  />
                  <button onClick={handleSaveLinkedIn}>Link</button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="header-right">
          {user && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="create-task-btn"
            >
              <Icons.Plus /> Post Task
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

      {showEditModal && currentEditTask && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Edit Opportunity</h2>
            <form onSubmit={handleUpdateTask} className="task-form">
              <input
                type="text"
                placeholder="Title"
                required
                value={currentEditTask.title}
                onChange={(e) =>
                  setCurrentEditTask({
                    ...currentEditTask,
                    title: e.target.value,
                  })
                }
              />
              <div className="geo-inputs">
                <input
                  type="number"
                  min="1"
                  placeholder="Amount"
                  required
                  value={currentEditTask.durationValue}
                  onChange={(e) =>
                    setCurrentEditTask({
                      ...currentEditTask,
                      durationValue: e.target.value,
                    })
                  }
                />
                <select
                  value={currentEditTask.durationUnit}
                  onChange={(e) =>
                    setCurrentEditTask({
                      ...currentEditTask,
                      durationUnit: e.target.value,
                    })
                  }
                >
                  <option value="Minutes">Minutes</option>
                  <option value="Hours">Hours</option>
                  <option value="Days">Days</option>
                </select>
              </div>
              <button
                type="submit"
                className="submit-btn"
                disabled={isSubmittingTask}
              >
                {isSubmittingTask ? "Saving..." : "Update Task"}
              </button>
            </form>
            <button
              className="close-btn"
              onClick={() => setShowEditModal(false)}
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
                  ? "Reset Password"
                  : isRegistering
                    ? "Register"
                    : "Login"}
            </h2>
            <form
              className="auth-form"
              onSubmit={
                isResetMode
                  ? handleResetPassword
                  : isForgotPassword
                    ? handleForgotPassword
                    : handleAuth
              }
            >
              {isRegistering && !isResetMode && !isForgotPassword && (
                <input
                  type="text"
                  placeholder="Name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              )}
              {!isResetMode && (
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
              {(!isForgotPassword || isResetMode) && (
                <input
                  type="password"
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
              <button type="submit" className="submit-btn">
                {isResetMode
                  ? "Update Password"
                  : isForgotPassword
                    ? "Send Link"
                    : isRegistering
                      ? "Sign Up"
                      : "Log In"}
              </button>
            </form>

            {/* 👇 FIXED LOGIN BUG: Ensures links are always visible */}
            {!isResetMode && (
              <div className="auth-links">
                {isForgotPassword ? (
                  <p
                    className="toggle-text"
                    onClick={() => setIsForgotPassword(false)}
                  >
                    Back to Login
                  </p>
                ) : isRegistering ? (
                  <p
                    className="toggle-text"
                    onClick={() => setIsRegistering(false)}
                  >
                    Back to Login
                  </p>
                ) : (
                  <>
                    <p
                      className="toggle-text"
                      onClick={() => setIsForgotPassword(true)}
                    >
                      Forgot Password?
                    </p>
                    <p
                      className="toggle-text"
                      onClick={() => setIsRegistering(true)}
                    >
                      Need an account? Register
                    </p>
                  </>
                )}
              </div>
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
        {error && (
          <div
            className="floating-error"
            style={{ color: "red", textAlign: "center", marginBottom: "10px" }}
          >
            {error}
          </div>
        )}
        {successMsg && (
          <div
            className="floating-success"
            style={{
              color: "green",
              textAlign: "center",
              marginBottom: "10px",
            }}
          >
            {successMsg}
          </div>
        )}

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
            className={viewMode === "list" && !showSavedOnly ? "active" : ""}
            onClick={() => {
              setViewMode("list");
              setShowSavedOnly(false);
            }}
          >
            <Icons.List /> List
          </button>
          <button
            className={viewMode === "map" && !showSavedOnly ? "active" : ""}
            onClick={() => {
              setViewMode("map");
              setShowSavedOnly(false);
            }}
          >
            <Icons.Map /> Map
          </button>
          {user && (
            <button
              className={
                viewMode === "applied" && !showSavedOnly ? "active" : ""
              }
              onClick={() => {
                setViewMode("applied");
                setShowSavedOnly(false);
              }}
            >
              <Icons.FileCheck /> My Apps
            </button>
          )}
          {user && (
            <button
              className={
                viewMode === "manage" && !showSavedOnly ? "active" : ""
              }
              onClick={() => {
                setViewMode("manage");
                setShowSavedOnly(false);
              }}
            >
              <Icons.Settings /> Manage
            </button>
          )}

          {user && (
            <button
              className={`save-filter-btn ${showSavedOnly ? "active" : ""}`}
              onClick={() => setShowSavedOnly(!showSavedOnly)}
            >
              <Icons.Heart filled={showSavedOnly} />{" "}
              {showSavedOnly ? "Showing Saved" : "Show Saved"}
            </button>
          )}
          <button
            className={viewMode === "leaderboard" ? "active" : ""}
            onClick={() => {
              setViewMode("leaderboard");
              setShowSavedOnly(false);
            }}
          >
            🏆 Leaderboard
          </button>
        </div>

        {viewMode === "applied" && !showSavedOnly ? (
          <div className="applied-section">
            <h2>My Volunteering Applications</h2>

            {/* 👇 VP-F05: RESTORED Status Summary Bar */}
            {tasks.filter((t) => user?.appliedTasks?.includes(t._id)).length >
              0 && (
              <div className="status-summary-bar">
                <div className="summary-item pending">
                  <span className="count">
                    {
                      tasks.filter(
                        (t) =>
                          t.applicants?.find((a) => a.userEmail === user.email)
                            ?.status === "Pending" &&
                          user.appliedTasks.includes(t._id),
                      ).length
                    }
                  </span>
                  <span className="label">Pending</span>
                </div>
                <div className="summary-item accepted">
                  <span className="count">
                    {
                      tasks.filter(
                        (t) =>
                          t.applicants?.find((a) => a.userEmail === user.email)
                            ?.status === "Accepted" &&
                          user.appliedTasks.includes(t._id),
                      ).length
                    }
                  </span>
                  <span className="label">Accepted</span>
                </div>
                <div className="summary-item completed">
                  <span className="count">
                    {
                      tasks.filter(
                        (t) =>
                          t.applicants?.find((a) => a.userEmail === user.email)
                            ?.status === "Completed" &&
                          user.appliedTasks.includes(t._id),
                      ).length
                    }
                  </span>
                  <span className="label">Completed</span>
                </div>
                <div className="summary-item declined">
                  <span className="count">
                    {
                      tasks.filter(
                        (t) =>
                          t.applicants?.find((a) => a.userEmail === user.email)
                            ?.status === "Declined" &&
                          user.appliedTasks.includes(t._id),
                      ).length
                    }
                  </span>
                  <span className="label">Declined</span>
                </div>
              </div>
            )}

            <div className="task-list">
              {tasks
                .filter((t) => user?.appliedTasks?.includes(t._id))
                .map((task) => {
                  const application = task.applicants?.find(
                    (a) => a.userEmail === user.email,
                  );
                  const status = application?.status || "Pending";
                  return (
                    <div
                      key={task._id}
                      className={`task-card status-border-${status.toLowerCase()}`}
                    >
                      <div className={`status-banner ${status.toLowerCase()}`}>
                        {status.toUpperCase()}
                      </div>
                      <h3>{task.title}</h3>
                      <p className="org-name">{task.organization}</p>
                      <p className="task-address">
                        <Icons.MapPin /> {task.address}
                      </p>
                      <div className="badge-container">
                        <span className="duration-badge macro">
                          <Icons.Clock /> {formatDuration(task.duration)}
                        </span>
                      </div>
                      {status !== "Completed" && (
                        <button
                          className="withdraw-btn"
                          onClick={() => handleApply(task._id)}
                        >
                          Withdraw
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ) : viewMode === "manage" && !showSavedOnly ? (
          <div className="manage-section">
            <h2>Management Dashboard</h2>
            <div className="task-grid">
              {myCreatedTasks.map((task) => (
                <div key={task._id} className="manage-card">
                  <div className="manage-card-header">
                    <h3>{task.title}</h3>
                    <span className="manage-duration-tag">
                      <Icons.Clock /> {formatDuration(task.duration)}
                    </span>
                  </div>

                  <div className="applicant-list">
                    {task.applicants.map((app) => (
                      <div key={app.userId} className="applicant-row">
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                          }}
                        >
                          <div>
                            <strong>{app.userName}</strong>{" "}
                            {app.isFlagged && (
                              <span title={app.flagReason}>🚩</span>
                            )}
                            <span
                              style={{ fontSize: "0.85rem", color: "#64748b" }}
                            >
                              ({app.status})
                            </span>
                          </div>
                          <a
                            href={`mailto:${app.userEmail}`}
                            style={{
                              color: "#2563eb",
                              fontSize: "0.85rem",
                              textDecoration: "none",
                            }}
                          >
                            ✉️ {app.userEmail}
                          </a>
                        </div>
                        <div className="action-btns">
                          {app.status === "Pending" && (
                            <>
                              <button
                                onClick={() =>
                                  handleUpdateStatus(
                                    task._id,
                                    app.userId,
                                    "Accepted",
                                  )
                                }
                                className="accept-action-btn"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() =>
                                  handleUpdateStatus(
                                    task._id,
                                    app.userId,
                                    "Declined",
                                  )
                                }
                                className="decline-action-btn"
                              >
                                Decline
                              </button>
                            </>
                          )}
                          {app.status === "Accepted" && (
                            <>
                              <button
                                onClick={() =>
                                  handleUpdateStatus(
                                    task._id,
                                    app.userId,
                                    "Completed",
                                  )
                                }
                                className="complete-btn"
                              >
                                Verify🏅
                              </button>
                              <button
                                onClick={() => handleFlag(task._id, app.userId)}
                                className="flag-btn"
                              >
                                🚩 Flag
                              </button>
                            </>
                          )}
                          {app.status === "Completed" && (
                            <>
                              <span
                                style={{
                                  color: "#16a34a",
                                  fontWeight: "bold",
                                  fontSize: "0.85rem",
                                  marginRight: "8px",
                                }}
                              >
                                Verified 🎉
                              </span>
                              {!app.isFlagged && (
                                <button
                                  onClick={() =>
                                    handleFlag(task._id, app.userId)
                                  }
                                  className="flag-btn"
                                >
                                  🚩 Flag
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="manage-footer-btns">
                    <button
                      className="edit-task-btn"
                      onClick={() => openEditModal(task)}
                    >
                      <Icons.Edit /> Edit Task
                    </button>
                    <button
                      className="delete-task-btn"
                      onClick={() => handleDeleteTask(task._id)}
                    >
                      <Icons.Trash /> Delete Task
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : viewMode === "leaderboard" ? (
          <div className="leaderboard-section">
            <h2>🏆 Top 10 Volunteers</h2>
            <div className="leaderboard-list">
              {leaderboard.map((v, index) => (
                <div
                  key={v._id}
                  className={`leaderboard-row rank-${index + 1}`}
                >
                  <div className="rank-num">{index + 1}</div>
                  <img
                    src={
                      v.profilePic ||
                      `https://ui-avatars.com/api/?name=${v.name}`
                    }
                    className="leaderboard-pic"
                    alt=""
                  />
                  <div className="leaderboard-info">
                    <span className="leaderboard-name">{v.name}</span>
                    <span className="leaderboard-points">
                      {v.totalVolunteerMinutes || 0} Minutes
                    </span>
                  </div>
                  {/* 👇 VP-E06: RESTORED LinkedIn icon on Leaderboard */}
                  {v.linkedInUrl && (
                    <a
                      href={v.linkedInUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="linkedin-leader-link"
                    >
                      <Icons.LinkedIn />
                    </a>
                  )}
                  {index === 0 && <span className="medal">🥇</span>}
                  {index === 1 && <span className="medal">🥈</span>}
                  {index === 2 && <span className="medal">🥉</span>}
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
                    {user && (
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteTask(task._id)}
                        title="Delete Task"
                      >
                        <Icons.Trash />
                      </button>
                    )}
                    <button
                      className={`heart-btn ${user?.savedTasks?.includes(task._id) ? "saved" : ""}`}
                      onClick={() => handleSaveTask(task._id)}
                    >
                      <Icons.Heart
                        filled={user?.savedTasks?.includes(task._id)}
                      />
                    </button>
                    {user?.interests?.includes(task.category) && (
                      <div className="recommended-badge">
                        <Icons.Star /> Recommended
                      </div>
                    )}
                    <h3>{task.title}</h3>
                    <p className="org-name">{task.organization}</p>
                    <p className="task-address">
                      <Icons.MapPin /> {task.address}
                    </p>
                    <span className="category-tag">{task.category}</span>
                    <div className="badge-container">
                      <span className="duration-badge macro">
                        <Icons.Clock /> {formatDuration(task.duration)}
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
                  style={{ height: "500px", width: "100%", zIndex: 1 }}
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
                          className="apply-btn-small"
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
