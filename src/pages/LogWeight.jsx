import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { FiArrowLeft } from "react-icons/fi";
import "../styles/LogWeight.css";

const LogWeight = () => {
  const navigate = useNavigate();
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("You must be logged in to log weight");
      }

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error("User document not found");
      }

      const weightEntry = {
        weight: parseFloat(weight),
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
        <button
          className="back-button"
          onClick={() => navigate("/progress-tracker")}
        >
          <FiArrowLeft size={20} style={{ marginRight: "8px" }} />
          Back
        </button>
        <h2>Log Weight</h2>
      </div>

      <form onSubmit={handleSubmit} className="log-weight-form">
        <div className="form-group">
          <label htmlFor="weight">Weight (lbs)</label>
          <input
            type="number"
            id="weight"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            required
            placeholder="Enter weight in pounds"
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
