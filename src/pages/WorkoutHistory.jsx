import React, { useState, useEffect, useRef } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import LoadingSpinner from "../components/LoadingSpinner";
import "../styles/WorkoutHistory.css";
import { useLocation } from "react-router-dom";
import { findMatchingExercises } from "../utils/exerciseUtils";
import { exerciseList } from "../data/exerciseList";

function WorkoutHistory() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [editingWorkoutLookup, setEditingWorkoutLookup] = useState(null);
  const [focusedExerciseIdx, setFocusedExerciseIdx] = useState(null);
  const [exerciseSuggestions, setExerciseSuggestions] = useState([]);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const exerciseInputRefs = useRef([]);

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

  // Open edit modal for a workout
  const openEditModal = (workout) => {
    setEditingWorkout(JSON.parse(JSON.stringify(workout)));
    setEditingWorkoutLookup({
      name: workout.name,
      date: workout.date,
      exerciseCount: workout.exercises?.length || 0,
    });
    setEditModalOpen(true);
  };

  // Close edit modal
  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingWorkout(null);
    setEditingWorkoutLookup(null);
  };

  // Add saveEditedWorkout function
  const saveEditedWorkout = async () => {
    if (
      !editingWorkout.name ||
      !editingWorkout.exercises.every(
        (ex) =>
          ex.name &&
          ex.sets.every((set) => set.reps && set.weight !== undefined)
      )
    ) {
      alert("Please fill out all fields before saving.");
      return;
    }
    try {
      const user = auth.currentUser;
      if (!user) return;
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) return;
      const userData = userDoc.data();
      let workoutsArr = userData.workouts ? [...userData.workouts] : [];
      // Find by lookup key (original name, date, exercise count)
      const idx = workoutsArr.findIndex(
        (w) =>
          w.name === editingWorkoutLookup.name &&
          formatDate(w.date) === formatDate(editingWorkoutLookup.date) &&
          (w.exercises?.length || 0) === editingWorkoutLookup.exerciseCount
      );
      if (idx === -1) {
        alert("Could not find the original workout to update.");
        return;
      }
      // Replace the workout
      workoutsArr[idx] = {
        ...editingWorkout,
      };
      await updateDoc(userRef, { workouts: workoutsArr });
      setWorkouts((prev) =>
        prev.map((w, i) => (i === idx ? { ...editingWorkout, id: w.id } : w))
      );
      closeEditModal();
    } catch (err) {
      alert("Failed to save workout. Please try again.");
    }
  };

  // Handle exercise name input change in modal
  const handleExerciseNameInput = (exIdx, value) => {
    setExerciseSearch(value);
    setFocusedExerciseIdx(exIdx);
    setExerciseSuggestions(findMatchingExercises(value));
    // Don't update the exercise name until a suggestion is selected
  };

  // Handle suggestion click
  const handleExerciseSuggestionClick = (exIdx, suggestion) => {
    const updated = [...editingWorkout.exercises];
    updated[exIdx].name = suggestion;
    setEditingWorkout({ ...editingWorkout, exercises: updated });
    setExerciseSearch("");
    setExerciseSuggestions([]);
    setFocusedExerciseIdx(null);
  };

  // Handle blur for input (close dropdown after a short delay to allow click)
  const handleExerciseInputBlur = () => {
    setTimeout(() => {
      setFocusedExerciseIdx(null);
      setExerciseSuggestions([]);
    }, 150);
  };

  // When opening modal, reset search state
  useEffect(() => {
    if (!editModalOpen) {
      setExerciseSearch("");
      setExerciseSuggestions([]);
      setFocusedExerciseIdx(null);
    }
  }, [editModalOpen]);

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
                {expandedWorkoutId === workout.id && (
                  <button
                    className="edit-workout-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(workout);
                    }}
                  >
                    Edit
                  </button>
                )}
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
                                {set.weight === "bodyweight" ||
                                set.weight === "BW" ||
                                set.weight === "🏋️‍♀️ bodyweight" ||
                                exercise.name.includes("(Bodyweight)")
                                  ? "🏋️‍♀️ bodyweight"
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

      {/* Edit Workout Modal */}
      {editModalOpen && editingWorkout && (
        <div className="edit-modal-overlay" onClick={closeEditModal}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Workout</h2>
            <form onSubmit={(e) => e.preventDefault()}>
              <label>
                Workout Name:
                <input
                  type="text"
                  value={editingWorkout.name || ""}
                  onChange={(e) =>
                    setEditingWorkout({
                      ...editingWorkout,
                      name: e.target.value,
                    })
                  }
                />
              </label>
              {editingWorkout.exercises &&
                editingWorkout.exercises.map((exercise, exIdx) => (
                  <div key={exIdx} className="edit-exercise-block">
                    <label>
                      Exercise Name:
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          value={
                            focusedExerciseIdx === exIdx
                              ? exerciseSearch
                              : exercise.name || ""
                          }
                          onChange={(e) =>
                            handleExerciseNameInput(exIdx, e.target.value)
                          }
                          onFocus={(e) => {
                            setFocusedExerciseIdx(exIdx);
                            setExerciseSearch(exercise.name || "");
                            setExerciseSuggestions(
                              findMatchingExercises(exercise.name || "")
                            );
                          }}
                          onBlur={handleExerciseInputBlur}
                          ref={(el) => (exerciseInputRefs.current[exIdx] = el)}
                          placeholder="Search exercises..."
                          autoComplete="off"
                        />
                        {focusedExerciseIdx === exIdx &&
                          exerciseSuggestions.length > 0 && (
                            <div className="suggestions-list visible">
                              {exerciseSuggestions.map((suggestion, i) => (
                                <div
                                  key={i}
                                  className="suggestion-item"
                                  style={{
                                    padding: "8px 12px",
                                    cursor: "pointer",
                                  }}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleExerciseSuggestionClick(
                                      exIdx,
                                      suggestion
                                    );
                                  }}
                                >
                                  {suggestion}
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    </label>
                    <div className="edit-sets-block">
                      <label>Sets:</label>
                      {exercise.sets && exercise.sets.length > 0 && (
                        <div className="edit-sets-header-row">
                          <span></span>
                          <span>Reps</span>
                          <span>Weight</span>
                        </div>
                      )}
                      {exercise.sets &&
                        exercise.sets.map((set, setIdx) => (
                          <div key={setIdx} className="edit-set-row">
                            <span>Set {setIdx + 1}</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="Reps"
                              value={set.reps}
                              onChange={(e) => {
                                const updated = [...editingWorkout.exercises];
                                updated[exIdx].sets[setIdx].reps =
                                  e.target.value;
                                setEditingWorkout({
                                  ...editingWorkout,
                                  exercises: updated,
                                });
                              }}
                            />
                            <input
                              type="number"
                              min="0"
                              max="1000"
                              step="0.1"
                              placeholder="Weight"
                              value={set.weight}
                              onChange={(e) => {
                                let val = e.target.value;
                                // Only allow numbers and one decimal point
                                if (!/^\d*\.?\d*$/.test(val)) return;
                                // Clamp value between 0 and 1000
                                if (
                                  val !== "" &&
                                  (parseFloat(val) < 0 ||
                                    parseFloat(val) > 1000)
                                )
                                  return;
                                const updated = [...editingWorkout.exercises];
                                updated[exIdx].sets[setIdx].weight = val;
                                setEditingWorkout({
                                  ...editingWorkout,
                                  exercises: updated,
                                });
                              }}
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              <div className="edit-modal-actions">
                <button type="button" onClick={closeEditModal}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEditedWorkout}
                  style={{
                    marginLeft: 8,
                    background: "var(--primary-orange)",
                    color: "#fff",
                  }}
                >
                  Save Workout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkoutHistory;
