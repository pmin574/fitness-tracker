import React, { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import "../styles/ProgressTracker.css";

function ProgressTracker() {
  const [workoutData, setWorkoutData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWorkoutData = async () => {
      try {
        setLoading(true);
        const user = auth.currentUser;
        if (!user) {
          setError("You must be logged in to view progress data");
          setLoading(false);
          return;
        }

        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setWorkoutData(userData.workouts || []);
        } else {
          setWorkoutData([]);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching workout data:", error);
        setError("Failed to load progress data");
        setLoading(false);
      }
    };

    fetchWorkoutData();
  }, []);

  const handleCardClick = (path) => {
    navigate(path);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="progress-tracker-container error">{error}</div>;
  }

  return (
    <div className="progress-tracker-container">
      <h2>Progress Tracker</h2>

      <div className="progress-cards">
        <div
          className="progress-card strength"
          onClick={() => handleCardClick("/strength-progress")}
        >
          <h3>Strength Progress</h3>
        </div>

        <div
          className="progress-card weight"
          onClick={() => handleCardClick("/weight-progress")}
        >
          <h3>Weight Progress</h3>
        </div>
      </div>
    </div>
  );
}

export default ProgressTracker;
