import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import LoadingSpinner from "../components/LoadingSpinner";
import "../styles/WorkoutHistory.css";
import { useLocation } from "react-router-dom";

function WorkoutHistory() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const location = useLocation();

  const fetchWorkouts = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        setError("You must be logged in to view workout history");
        setLoading(false);
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Sort workouts by date - most recent first
        const sortedWorkouts = userData.workouts ? [...userData.workouts] : [];
        sortedWorkouts.sort((a, b) => {
          // Parse dates to comparable values - MOST IMPORTANT STEP

          // For MM/DD/YYYY format strings, convert to Date objects
          const parseDate = (dateStr) => {
            // Handle YYYY-MM-DD format
            if (
              typeof dateStr === "string" &&
              dateStr.match(/^\d{4}-\d{2}-\d{2}$/)
            ) {
              const [year, month, day] = dateStr.split("-").map(Number);
              return new Date(year, month - 1, day); // month is 0-indexed in JS
            }

            // Handle Firestore timestamps
            if (typeof dateStr === "object" && dateStr.seconds) {
              return new Date(dateStr.seconds * 1000);
            }

            // Default case - try to create a date
            return new Date(dateStr);
          };

          // Create proper Date objects that can be compared
          const dateA = parseDate(a.date);
          const dateB = parseDate(b.date);

          // Sort descending (newest first)
          return dateB - dateA;
        });

        // Add a unique ID to each workout for tracking expanded state
        const processedWorkouts = sortedWorkouts.map((workout, index) => ({
          ...workout,
          id: index.toString(),
        }));

        setWorkouts(processedWorkouts);

        // Check if we should auto-expand a workout from location state
        if (location.state?.selectedWorkout) {
          // Find the workout that matches the selected workout from dashboard
          const selectedWorkout = location.state.selectedWorkout;
          const matchingWorkout = processedWorkouts.find(
            (workout) =>
              workout.name === selectedWorkout.name &&
              formatDate(workout.date) === formatDate(selectedWorkout.date)
          );

          if (matchingWorkout) {
            setExpandedWorkoutId(matchingWorkout.id);

            // Scroll to the expanded workout after render
            setTimeout(() => {
              const element = document.getElementById(
                `workout-${matchingWorkout.id}`
              );
              if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }, 100);
          }
        }
      } else {
        setWorkouts([]);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching workouts:", error);
      setError("Failed to load workout history");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkouts();
  }, []);

  // Function to toggle expanded state
  const toggleWorkoutDetails = (workoutId) => {
    if (expandedWorkoutId === workoutId) {
      setExpandedWorkoutId(null);
    } else {
      setExpandedWorkoutId(workoutId);
    }
  };

  // Function to delete a workout
  const deleteWorkout = async (e, workoutId) => {
    e.stopPropagation(); // Prevent expansion of workout card

    if (isDeleting) return; // Prevent multiple clicks

    if (!window.confirm("Are you sure you want to delete this workout?")) {
      return;
    }

    try {
      setIsDeleting(true);

      const user = auth.currentUser;
      if (!user) return;

      // Get the workout to delete
      const workoutToDelete = workouts.find((w) => w.id === workoutId);
      if (!workoutToDelete) return;

      // Filter out the workout to delete
      const updatedWorkouts = workouts.filter((w) => w.id !== workoutId);

      // Get the actual workout data without our added 'id' property
      const { id, ...workoutData } = workoutToDelete;

      // Update Firestore by removing the workout
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Filter out the workout that matches the properties of workoutData
        const filteredWorkouts = userData.workouts.filter((w) => {
          // Compare relevant properties to identify the workout
          return !(
            w.name === workoutData.name &&
            formatDate(w.date) === formatDate(workoutData.date) &&
            w.exercises?.length === workoutData.exercises?.length
          );
        });

        // Update the user document with filtered workouts
        await updateDoc(userRef, {
          workouts: filteredWorkouts,
        });

        // Update local state
        setWorkouts(updatedWorkouts);

        if (expandedWorkoutId === workoutId) {
          setExpandedWorkoutId(null);
        }
      }

      setIsDeleting(false);
    } catch (error) {
      console.error("Error deleting workout:", error);
      alert("Failed to delete workout. Please try again.");
      setIsDeleting(false);
    }
  };

  // Function to format the date
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown Date";

    // For directly formatted YYYY-MM-DD strings, format for display
    if (
      typeof dateString === "string" &&
      dateString.match(/^\d{4}-\d{2}-\d{2}$/)
    ) {
      const [year, month, day] = dateString.split("-");
      return `${month}/${day}/${year}`;
    }

    // Handle Firestore timestamps (for backward compatibility)
    if (typeof dateString === "object" && dateString.seconds) {
      return new Date(dateString.seconds * 1000).toLocaleDateString();
    }

    // Fall back to regular date conversion for other cases
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  // Count total sets in a workout
  const countTotalSets = (exercises) => {
    if (!exercises || !Array.isArray(exercises)) return 0;
    return exercises.reduce((total, exercise) => {
      return total + (exercise.sets?.length || 0);
    }, 0);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="workout-history-container error">{error}</div>;
  }

  if (workouts.length === 0) {
    return (
      <div className="workout-history-container empty">
        <h2>Workout History</h2>
        <p>You haven't logged any workouts yet. Start by logging a workout!</p>
      </div>
    );
  }

  return (
    <div className="workout-history-container">
      <h2>Workout History</h2>

      <div className="workout-cards">
        {workouts.map((workout) => (
          <div
            key={workout.id}
            id={`workout-${workout.id}`}
            className={`workout-card ${
              expandedWorkoutId === workout.id ? "expanded" : ""
            }`}
            onClick={() => toggleWorkoutDetails(workout.id)}
          >
            <div className="workout-card-header">
              <div className="workout-card-title">
                <h3>{workout.name || "Untitled Workout"}</h3>
                <span className="workout-date">{formatDate(workout.date)}</span>
              </div>
              <div className="workout-card-actions">
                <div className="workout-card-summary">
                  <span>{workout.exercises?.length || 0} Exercises</span>
                  <span>{countTotalSets(workout.exercises)} Sets</span>
                </div>
                <button
                  className="delete-workout-btn"
                  onClick={(e) => deleteWorkout(e, workout.id)}
                  disabled={isDeleting}
                >
                  <span className="delete-icon">×</span>
                </button>
              </div>
            </div>

            {expandedWorkoutId === workout.id && (
              <div className="workout-details">
                {workout.exercises &&
                  workout.exercises.map((exercise, exIndex) => (
                    <div key={exIndex} className="exercise-details">
                      <h4>{exercise.name}</h4>
                      <div className="sets-table">
                        <div className="sets-table-header">
                          <div className="set-number">Set</div>
                          <div className="set-reps">Reps</div>
                          <div className="set-weight">Weight</div>
                        </div>
                        {exercise.sets &&
                          exercise.sets.map((set, setIndex) => (
                            <div key={setIndex} className="set-row">
                              <div className="set-number">{setIndex + 1}</div>
                              <div className="set-reps">{set.reps}</div>
                              <div className="set-weight">
                                {set.weight === "bodyweight"
                                  ? "BW"
                                  : set.weight}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default WorkoutHistory;
