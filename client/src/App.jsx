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
      .get(`${import.meta.env.VITE_API_URL}/api/tasks?maxTime=${filter}`)
      .then((res) => setTasks(res.data))
      .catch((err) => console.error(err));
  }, [filter]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    const endpoint = isRegistering ? "/api/register" : "/api/login";
    try {
      // UPDATED FOR PRODUCTION: Points to Render Backend
      const res = await axios.post(
        `https://volunteer-pulse-backend.onrender.com${endpoint}`,
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

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    try {
      // UPDATED FOR PRODUCTION: Points to Render Backend
      const res = await axios.post(
        "https://volunteer-pulse-backend.onrender.com/api/forgot-password",
        { email },
      );
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
      // UPDATED FOR PRODUCTION: Points to Render Backend
      const res = await axios.post(
        `https://volunteer-pulse-backend.onrender.com/api/reset-password/${resetToken}`,
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

  return (
    <div className="container">
      <header className="app-header">
        <div className="header-left">
          <h1>VolunteerPulse</h1>
        </div>
        <div className="header-center">
          {user && (
            <span>
              Welcome, <strong>{user.name}</strong>!
            </span>
          )}
        </div>
        <div className="header-right">
          {user ? (
            <button onClick={logout} className="logout-btn">
              Logout
            </button>
          ) : (
            <button
              onClick={() => {
                setShowLogin(true);
                setIsForgotPassword(false);
                setIsRegistering(false);
                setIsResetMode(false);
              }}
              className="login-btn"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {showLogin && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>
              {isResetMode
                ? "Create New Password"
                : isForgotPassword
                  ? "Reset Password"
                  : isRegistering
                    ? "Create Account"
                    : "Welcome Back"}
            </h2>
            {error && <p style={{ color: "red" }}>{error}</p>}
            {successMsg && <p style={{ color: "green" }}>{successMsg}</p>}

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
                  Update Password
                </button>
              </form>
            ) : isForgotPassword ? (
              <form onSubmit={handleForgotPassword}>
                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button type="submit" className="submit-btn">
                  Send Reset Link
                </button>
                <p
                  className="toggle-text"
                  onClick={() => setIsForgotPassword(false)}
                  style={{ cursor: "pointer", color: "blue" }}
                >
                  Back to Login
                </p>
              </form>
            ) : (
              <form onSubmit={handleAuth}>
                {isRegistering && (
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                )}
                <input
                  type="email"
                  placeholder="Email Address"
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
                    style={{
                      cursor: "pointer",
                      color: "gray",
                      fontSize: "12px",
                    }}
                  >
                    Forgot Password?
                  </p>
                )}
              </form>
            )}

            {!isForgotPassword && !isResetMode && (
              <p
                className="toggle-text"
                onClick={() => setIsRegistering(!isRegistering)}
                style={{ cursor: "pointer", color: "blue" }}
              >
                {isRegistering
                  ? "Already have an account? Log In"
                  : "New here? Create Account"}
              </p>
            )}
            <button
              className="close-btn"
              onClick={() => {
                setShowLogin(false);
                window.history.pushState({}, "", "/");
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="main-content">
        <div className="filter-section">
          <label>I have available time:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="time-select"
          >
            <option value="15">15 Minutes (Micro)</option>
            <option value="60">1 Hour</option>
            <option value="240">4 Hours</option>
            <option value="999999">Show Everything</option>
          </select>
        </div>
        <div className="task-list">
          {tasks.map((task) => (
            <div key={task._id} className="task-card">
              <div>
                <h3>{task.title}</h3>
                <p className="org-name">{task.organization}</p>
              </div>
              <div className="badge-container">
                <span
                  className={`duration-badge ${task.duration <= 60 ? "micro" : "macro"}`}
                >
                  ⏱ {formatDuration(task.duration)}
                </span>
              </div>
              <button
                onClick={() =>
                  alert(
                    user ? `Applied to ${task.title}` : "Please Log In first!",
                  )
                }
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
