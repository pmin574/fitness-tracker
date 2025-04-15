import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import "../styles/LogWeight.css";

const LogWeight = () => {
  const navigate = useNavigate();
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(() => {
    // Get the current date in local timezone, ensuring it's today's date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0"); // months are 0-indexed
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Handle weight input validation with up to 2 decimal places
  const handleWeightChange = (value) => {
    // Allow empty or just a decimal point for typing
    if (value === "" || value === ".") {
      setWeight(value);
      return;
    }

    // Validate the input pattern for weight with up to 2 decimal places
    const validWeightPattern = /^[0-9]*\.?[0-9]{0,2}$/;
    if (!validWeightPattern.test(value)) {
      return; // Reject invalid input
    }

    // Check if value is within range (1-1500)
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && (numValue < 1 || numValue > 1500)) {
      return; // Reject out of range values
    }

    // If it passes validation, update the state
    setWeight(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("You must be logged in to log weight");
      }

      // Validate weight is within acceptable range
      const weightValue = parseFloat(weight);
      if (isNaN(weightValue) || weightValue < 1 || weightValue > 1500) {
        throw new Error("Weight must be between 1 and 1500 pounds");
      }

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error("User document not found");
      }

      const weightEntry = {
        weight: weightValue,
        date: date,
        timestamp: new Date().toISOString(),
      };

      await updateDoc(userRef, {
        weightLogs: arrayUnion(weightEntry),
      });

      navigate("/weight-history");
    } catch (error) {
      console.error("Error logging weight:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="log-weight-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="log-weight-header">
        <h2>Log Weight</h2>
      </div>

      <form onSubmit={handleSubmit} className="log-weight-form">
        <div className="form-group">
          <label htmlFor="weight">Weight (lbs)</label>
          <input
            type="text"
            id="weight"
            value={weight}
            onChange={(e) => handleWeightChange(e.target.value)}
            required
            placeholder="Enter weight in pounds"
            pattern="^[0-9]+(\.[0-9]{1,2})?$"
            title="Enter a weight value between 1-1500 pounds"
            min="1"
            max="1500"
          />
        </div>

        <div className="form-group">
          <label htmlFor="date">Date</label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            max={(() => {
              const today = new Date();
              const year = today.getFullYear();
              const month = String(today.getMonth() + 1).padStart(2, "0");
              const day = String(today.getDate()).padStart(2, "0");
              return `${year}-${month}-${day}`;
            })()}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? "Logging..." : "Log Weight"}
        </button>
      </form>
    </motion.div>
  );
};

export default LogWeight;
