import { useState, useEffect, useContext } from "react";
import axios from "axios";
import "./App.css";
import AuthContext, { AuthProvider } from "./AuthContext";

// --- MAIN APP COMPONENT ---
function VolunteerApp() {
  const { user, login, logout } = useContext(AuthContext);

  // Task State
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState(999999);

  // Auth Form State
  const [showLogin, setShowLogin] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  // Fetch Tasks
  useEffect(() => {
    axios
      .get(`http://localhost:5001/api/tasks?maxTime=${filter}`)
      .then((res) => setTasks(res.data))
      .catch((err) => console.error(err));
  }, [filter]);

  // Handle Login/Register
  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    const endpoint = isRegistering ? "/api/register" : "/api/login";
    const payload = isRegistering
      ? { name, email, password }
      : { email, password };

    try {
      const res = await axios.post(`http://localhost:5001${endpoint}`, payload);
      if (isRegistering) {
        setIsRegistering(false); // Switch to login after signup
        setError("Account created! Please log in.");
      } else {
        login(res.data.user);
        setShowLogin(false); // Close modal
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred");
    }
  };

  // Helper for Duration
  const formatDuration = (mins) => {
    if (mins < 60) return `${mins} Mins`;
    if (mins < 1440) return `${mins / 60} Hours`;
    return `${mins / 1440} Days`;
  };

  return (
    <div className="container">
      {/* HEADER: 3-Column Layout */}
      <header className="app-header">
        {/* LEFT: Logo */}
        <div className="header-left">
          <h1>VolunteerPulse</h1>
        </div>

        {/* CENTER: Welcome Message (Only shows if logged in) */}
        <div className="header-center">
          {user && (
            <span>
              Welcome, <strong>{user.name}</strong>!
            </span>
          )}
        </div>

        {/* RIGHT: Action Button */}
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

      {/* LOGIN MODAL (Overlay) */}
      {showLogin && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{isRegistering ? "Create Account" : "Welcome Back"}</h2>
            {error && <p className="error-msg">{error}</p>}

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
            </form>

            <p
              className="toggle-text"
              onClick={() => setIsRegistering(!isRegistering)}
            >
              {isRegistering
                ? "Already have an account? Log In"
                : "New here? Create Account"}
            </p>
            <button className="close-btn" onClick={() => setShowLogin(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* FILTER & TASKS (Only show if not logging in) */}
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

// Wrap App in Provider
export default function App() {
  return (
    <AuthProvider>
      <VolunteerApp />
    </AuthProvider>
  );
}
