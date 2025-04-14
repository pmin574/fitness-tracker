import React, { useState, useEffect } from "react";
import {
  doc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import {
  findMatchingExercises,
  findClosestExercise,
} from "../utils/exerciseUtils";
import "../styles/LogWorkout.css";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiCheck } from "react-icons/fi";

function LogWorkout() {
  const [exercises, setExercises] = useState([
    {
      id: 1,
      name: "",
      sets: [{ id: 1, reps: "", weight: "" }],
    },
  ]);
  const [workoutName, setWorkoutName] = useState("");
  const [workoutDate, setWorkoutDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [focusedExerciseId, setFocusedExerciseId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  // Test that exercise list is working
  useEffect(() => {
    console.log("Testing exercise matching:", findMatchingExercises("bench"));
  }, []);

  // Clear success message after animation
  useEffect(() => {
    let successTimer;

    if (success) {
      // Clear any existing timers to prevent overlapping animations
      if (successTimer) clearTimeout(successTimer);

      // Set a new timer for clearing the success state
      successTimer = setTimeout(() => {
        setSuccess(false);
      }, 2500); // Duration slightly longer than animation
    }

    // Clean up timer on component unmount or when success changes
    return () => {
      if (successTimer) clearTimeout(successTimer);
    };
  }, [success]);

  // Add a new exercise to the workout
  const addExercise = () => {
    const newExerciseId = Date.now();
    const newExercise = {
      id: newExerciseId,
      name: "",
      sets: [{ id: newExerciseId + 1, reps: "", weight: "" }],
    };

    // Create a completely new array
    const newExercises = [...exercises, newExercise];
    setExercises(newExercises);

    console.log("Added new exercise, total:", newExercises.length);
  };

  // Remove an exercise from the workout
  const removeExercise = (exerciseId) => {
    setExercises(exercises.filter((exercise) => exercise.id !== exerciseId));
  };

  // Add a new set to an exercise
  const addSet = (exerciseId) => {
    setExercises(
      exercises.map((exercise) => {
        if (exercise.id === exerciseId) {
          return {
            ...exercise,
            sets: [...exercise.sets, { id: Date.now(), reps: "", weight: "" }],
          };
        }
        return exercise;
      })
    );
  };

  // Remove a set from an exercise
  const removeSet = (exerciseId, setId) => {
    setExercises(
      exercises.map((exercise) => {
        if (exercise.id === exerciseId) {
          // Don't remove if it's the only set
          if (exercise.sets.length === 1) return exercise;

          return {
            ...exercise,
            sets: exercise.sets.filter((set) => set.id !== setId),
          };
        }
        return exercise;
      })
    );
  };

  // Handle exercise name change and show suggestions
  const handleExerciseNameChange = (id, value) => {
    setExercises(
      exercises.map((exercise) =>
        exercise.id === id ? { ...exercise, name: value } : exercise
      )
    );

    // Show suggestions if there's input
    if (value.trim()) {
      const matches = findMatchingExercises(value);
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (exerciseId, suggestion) => {
    setExercises(
      exercises.map((exercise) =>
        exercise.id === exerciseId
          ? { ...exercise, name: suggestion }
          : exercise
      )
    );
    setSuggestions([]);
  };

  // Handle set input changes
  const handleSetChange = (exerciseId, setId, field, value) => {
    // For reps field, only allow whole numbers
    if (field === "reps") {
      // Remove any non-digit characters
      const numericValue = value.replace(/\D/g, "");

      setExercises(
        exercises.map((exercise) => {
          if (exercise.id === exerciseId) {
            return {
              ...exercise,
              sets: exercise.sets.map((set) => {
                if (set.id === setId) {
                  return { ...set, [field]: numericValue };
                }
                return set;
              }),
            };
          }
          return exercise;
        })
      );
    } else {
      // Handle other fields normally
      setExercises(
        exercises.map((exercise) => {
          if (exercise.id === exerciseId) {
            return {
              ...exercise,
              sets: exercise.sets.map((set) => {
                if (set.id === setId) {
                  return { ...set, [field]: value };
                }
                return set;
              }),
            };
          }
          return exercise;
        })
      );
    }
  };

  // Handle input key down
  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const form = e.target.form;
      const index = Array.from(form.elements).indexOf(e.target);
      const nextElement = form.elements[index + 1];
      if (nextElement) {
        nextElement.focus();
      }
    }
  };

  // Save workout to Firestore
  const saveWorkout = async (e) => {
    e.preventDefault();

    // Prevent multiple submissions or triggering success animation more than once
    if (isSaving || success) return;

    setError(null);
    setIsSaving(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        setError("You must be logged in to save a workout");
        setIsSaving(false);
        return;
      }

      // Simple validation
      if (exercises.some((ex) => !ex.name.trim())) {
        setError("Please provide a name for all exercises");
        setIsSaving(false);
        return;
      }

      if (exercises.some((ex) => ex.sets.some((set) => !set.reps))) {
        setError("Please provide reps for all sets");
        setIsSaving(false);
        return;
      }

      // Format workout data using the exact selected date
      const workoutData = {
        name: workoutName || `Workout ${new Date().toLocaleDateString()}`,
        date: workoutDate, // Store exact date string from form
        timestamp: Date.now(), // Add timestamp for sorting purposes only
        exercises: exercises.map((exercise) => ({
          name: exercise.name,
          sets: exercise.sets.map((set) => ({
            reps: set.reps,
            weight: set.weight || "bodyweight", // If weight is empty, mark as bodyweight
          })),
        })),
      };

      // Add workout to Firestore
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        workouts: arrayUnion(workoutData),
      });

      // Show success animation - only set once
      setSuccessMessage("Great job! Workout saved successfully!");
      setIsSaving(false);
      setSuccess(true);

      // Reset form after animation finishes - use a ref to prevent duplicate timeouts
      const resetTimeout = setTimeout(() => {
        setWorkoutName("");
        setWorkoutDate(new Date().toISOString().split("T")[0]); // Reset to today
        setExercises([
          {
            id: Date.now(),
            name: "",
            sets: [{ id: Date.now(), reps: "", weight: "" }],
          },
        ]);
      }, 2000);

      return () => clearTimeout(resetTimeout);
    } catch (error) {
      console.error("Error saving workout:", error);
      setError("Error saving workout. Please try again.");
      setIsSaving(false);
    }
  };

  return (
    <div className="log-workout-container">
      <h1>Log Workout</h1>
      <form onSubmit={saveWorkout}>
        <div className="form-header">
          <div className="form-group">
            <label htmlFor="workoutName">Workout Name</label>
            <input
              type="text"
              id="workoutName"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              placeholder="Enter workout name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="workoutDate">Date</label>
            <input
              type="date"
              id="workoutDate"
              value={workoutDate}
              onChange={(e) => setWorkoutDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>

        <div className="exercises-container">
          {exercises.map((exercise, exerciseIndex) => (
            <div key={exercise.id} className="exercise-item">
              <div className="exercise-header">
                <h3>Exercise {exerciseIndex + 1}</h3>
                <button
                  type="button"
                  onClick={() => removeExercise(exercise.id)}
                  className="remove-btn"
                >
                  Remove
                </button>
              </div>

              <div className="form-group">
                <label htmlFor={`exercise-${exercise.id}`}>Exercise Name</label>
                <div className="exercise-name-input-container">
                  <input
                    type="text"
                    id={`exercise-${exercise.id}`}
                    value={exercise.name}
                    onChange={(e) =>
                      handleExerciseNameChange(exercise.id, e.target.value)
                    }
                    placeholder="Enter exercise name"
                    onFocus={() => setFocusedExerciseId(exercise.id)}
                    onBlur={() => {
                      // Add a small delay to allow for suggestion click
                      setTimeout(() => {
                        setFocusedExerciseId(null);
                        setSuggestions([]);
                      }, 200);
                    }}
                    autoComplete="off"
                  />
                  {focusedExerciseId === exercise.id &&
                    suggestions.length > 0 && (
                      <div className="suggestions-list">
                        {suggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="suggestion-item"
                            onClick={() =>
                              handleSuggestionClick(exercise.id, suggestion)
                            }
                          >
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>

              <div className="sets-container">
                <h4>Sets</h4>
                {exercise.sets.map((set, setIndex) => (
                  <div key={set.id} className="set-item">
                    <div className="set-header">
                      <span>Set {setIndex + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeSet(exercise.id, set.id)}
                        className="remove-btn"
                        disabled={exercise.sets.length === 1}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="set-inputs">
                      <div className="form-group">
                        <label htmlFor={`reps-${exercise.id}-${set.id}`}>
                          Reps
                        </label>
                        <input
                          type="number"
                          id={`reps-${exercise.id}-${set.id}`}
                          value={set.reps}
                          onChange={(e) =>
                            handleSetChange(
                              exercise.id,
                              set.id,
                              "reps",
                              e.target.value
                            )
                          }
                          onKeyDown={handleInputKeyDown}
                          placeholder="e.g., 10"
                          min="1"
                          step="1"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor={`weight-${exercise.id}-${set.id}`}>
                          Weight (optional)
                        </label>
                        <input
                          type="text"
                          id={`weight-${exercise.id}-${set.id}`}
                          value={set.weight}
                          onChange={(e) =>
                            handleSetChange(
                              exercise.id,
                              set.id,
                              "weight",
                              e.target.value
                            )
                          }
                          onKeyDown={handleInputKeyDown}
                          placeholder="e.g., 135 or leave empty"
                          required={false}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addSet(exercise.id)}
                  className="add-set-btn"
                >
                  Add Set
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={addExercise}
            className="add-exercise-btn"
            disabled={isSaving}
          >
            Add Exercise
          </button>
          <button
            type="submit"
            className={`save-workout-btn ${isSaving ? "saving" : ""}`}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Workout"}
          </button>
        </div>
      </form>

      <AnimatePresence mode="wait">
        {success && (
          <motion.div
            className="success-message"
            key="success-message"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              duration: 0.3,
              type: "spring",
              stiffness: 200,
              damping: 20,
            }}
          >
            <motion.div
              className="success-icon"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                duration: 0.5,
                type: "spring",
                stiffness: 260,
                damping: 20,
              }}
            >
              <FiCheck size={40} strokeWidth={3} />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {successMessage}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}

export default LogWorkout;
