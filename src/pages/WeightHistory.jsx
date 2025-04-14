import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import LoadingSpinner from "../components/LoadingSpinner";
import "../styles/WeightHistory.css";

const WeightHistory = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weightLogs, setWeightLogs] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchWeightLogs = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        throw new Error("You must be logged in to view weight history");
      }

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const logs = userData.weightLogs || [];

        // Sort logs by date (newest first)
        const sortedLogs = [...logs].sort((a, b) => {
          return new Date(b.date) - new Date(a.date);
        });

        // Add unique IDs to each log for identification
        const logsWithIds = sortedLogs.map((log, index) => ({
          ...log,
          id: `weight-${log.timestamp || Date.now()}-${index}`,
        }));

        setWeightLogs(logsWithIds);
      } else {
        setWeightLogs([]);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching weight logs:", error);
      setError(error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeightLogs();
  }, []);

  const formatDate = (dateString) => {
    // Split the date string into components
    const [year, month, day] = dateString.split("-").map(Number);
    // Create date using local timezone (month is 0-based in Date constructor)
    const date = new Date(year, month - 1, day);
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };

  const deleteWeightLog = async (logId) => {
    if (isDeleting) return; // Prevent multiple deletion attempts

    if (
      !window.confirm("Are you sure you want to delete this weight log entry?")
    ) {
      return;
    }

    try {
      setIsDeleting(true);

      const user = auth.currentUser;
      if (!user) {
        throw new Error("You must be logged in to delete weight logs");
      }

      // Find the log to delete
      const logToDelete = weightLogs.find((log) => log.id === logId);
      if (!logToDelete) {
        throw new Error("Weight log not found");
      }

      // Get a reference to the user document
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();

        // Filter out the weight log to delete based on date and weight
        // We need to match on properties since the original logs don't have our added ID
        const updatedLogs = userData.weightLogs.filter((log) => {
          return !(
            log.date === logToDelete.date &&
            log.weight === logToDelete.weight &&
            (log.timestamp === logToDelete.timestamp ||
              (!log.timestamp && !logToDelete.timestamp))
          );
        });

        // Update the user document with the filtered logs
        await updateDoc(userRef, {
          weightLogs: updatedLogs,
        });

        // Update the local state
        setWeightLogs(weightLogs.filter((log) => log.id !== logId));

        console.log("Weight log deleted successfully");
      }
    } catch (error) {
      console.error("Error deleting weight log:", error);
      alert(`Failed to delete weight log: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="weight-history-container error">{error}</div>;
  }

  return (
    <motion.div
      className="weight-history-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="weight-history-header">
        <h2>Weight History</h2>
      </div>

      {weightLogs.length === 0 ? (
        <div className="no-logs-message">
          <p>No weight logs found.</p>
          <p>
            Start tracking your weight by clicking "Log Weight" in the menu.
          </p>
        </div>
      ) : (
        <div className="weight-logs-list">
          {weightLogs.map((log) => (
            <div key={log.id} className="weight-log-card">
              <div className="weight-log-date">{formatDate(log.date)}</div>
              <div className="weight-log-details">
                <div className="weight-value">{log.weight} lbs</div>
                <button
                  className="delete-log-btn"
                  onClick={() => deleteWeightLog(log.id)}
                  disabled={isDeleting}
                >
                  <FiTrash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default WeightHistory;
