import React, { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import "../styles/Header.css";

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Don't render the header on the login page
  if (location.pathname === "/") {
    return null;
  }

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMenuOpen(false);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <div
          className="logo"
          onClick={() => navigate("/dashboard")}
          role="button"
          tabIndex="0"
        >
          <div className="logo-icon">NR</div>
          <div className="logo-text">NextRep</div>
        </div>
        <div className="menu-container">
          <div
            className={`hamburger ${menuOpen ? "open" : ""}`}
            onClick={toggleMenu}
          >
            <span></span>
            <span></span>
            <span></span>
          </div>
          {menuOpen && (
            <div className="dropdown-menu">
              <ul>
                <li>
                  <Link to="/dashboard" onClick={toggleMenu}>
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/log-workout" onClick={toggleMenu}>
                    Log Workout
                  </Link>
                </li>
                <li>
                  <Link to="/log-weight" onClick={toggleMenu}>
                    Log Weight
                  </Link>
                </li>
                <li className="menu-divider"></li>
                <li>
                  <Link to="/workout-history" onClick={toggleMenu}>
                    Workout History
                  </Link>
                </li>
                <li>
                  <Link to="/weight-history" onClick={toggleMenu}>
                    Weight History
                  </Link>
                </li>
                <li className="menu-divider"></li>
                <li>
                  <Link to="/progress-tracker" onClick={toggleMenu}>
                    Progress Tracker
                  </Link>
                </li>
                <li className="menu-divider"></li>
                <li>
                  <button className="logout-menu-button" onClick={handleLogout}>
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
