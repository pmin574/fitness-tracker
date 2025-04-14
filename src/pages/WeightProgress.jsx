import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { FiArrowLeft, FiPlus } from "react-icons/fi";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import "../styles/WeightProgress.css";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const WeightProgress = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weightLogs, setWeightLogs] = useState([]);
  const [dateRange, setDateRange] = useState("3m"); // Options: "1m", "3m", "6m", "1y", "all"

  useEffect(() => {
    const fetchWeightLogs = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          throw new Error("You must be logged in to view weight progress");
        }

        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const logs = userData.weightLogs || [];

          // Sort logs by date
          const sortedLogs = [...logs].sort((a, b) => {
            return new Date(a.date) - new Date(b.date);
          });

          setWeightLogs(sortedLogs);
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

    fetchWeightLogs();
  }, []);

  const formatDate = (dateString) => {
    // Split the date string into components
    const [year, month, day] = dateString.split("-").map(Number);
    // Create date using local timezone (month is 0-based in Date constructor)
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const parseDate = (dateString) => {
    // Split the date string into components
    const [year, month, day] = dateString.split("-").map(Number);
    // Create date using local timezone (month is 0-based in Date constructor)
    return new Date(year, month - 1, day);
  };

  const getFilteredLogs = () => {
    if (!weightLogs.length) return [];

    const now = new Date();
    let startDate;

    switch (dateRange) {
      case "1m":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          now.getDate()
        );
        break;
      case "3m":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 3,
          now.getDate()
        );
        break;
      case "6m":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 6,
          now.getDate()
        );
        break;
      case "1y":
        startDate = new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate()
        );
        break;
      case "all":
      default:
        return weightLogs;
    }

    return weightLogs.filter((log) => parseDate(log.date) >= startDate);
  };

  const getChartData = () => {
    const filteredLogs = getFilteredLogs();

    return {
      labels: filteredLogs.map((log) => formatDate(log.date)),
      datasets: [
        {
          label: "Weight (lbs)",
          data: filteredLogs.map((log) => log.weight),
          borderColor: "rgb(255, 87, 34)",
          backgroundColor: "rgba(255, 87, 34, 0.5)",
          tension: 0.3,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        titleColor: "#333",
        bodyColor: "#666",
        borderColor: "rgba(0, 0, 0, 0.1)",
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: function (context) {
            return `Weight: ${context.parsed.y} lbs`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="weight-progress-container error">{error}</div>;
  }

  const getWeightChange = () => {
    const filteredLogs = getFilteredLogs();
    if (filteredLogs.length === 0) return null;

    const currentWeight = filteredLogs[filteredLogs.length - 1].weight;
    const currentDate = parseDate(filteredLogs[filteredLogs.length - 1].date);

    // Get the date 7 days ago
    const oneWeekAgo = new Date(currentDate);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Find the closest weight log before one week ago
    let previousWeight = null;
    for (let i = filteredLogs.length - 2; i >= 0; i--) {
      const logDate = parseDate(filteredLogs[i].date);
      if (logDate <= oneWeekAgo) {
        previousWeight = filteredLogs[i].weight;
        break;
      }
    }

    // If no weight log found from previous week, return null
    if (previousWeight === null) return null;

    const change = currentWeight - previousWeight;

    return {
      value: Math.abs(change).toFixed(1),
      direction: change > 0 ? "gained" : "lost",
      timeframe: "past week",
    };
  };

  return (
    <motion.div
      className="weight-progress-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="weight-progress-header">
        <button
          className="back-button"
          onClick={() => navigate("/progress-tracker")}
        >
          <FiArrowLeft size={20} style={{ marginRight: "8px" }} />
          Back
        </button>
        <h2>Weight Progress</h2>
        <button
          className="log-weight-button"
          onClick={() => navigate("/log-weight")}
        >
          <FiPlus size={20} style={{ marginRight: "8px" }} />
          Log Weight
        </button>
      </div>

      {weightLogs.length === 0 ? (
        <div className="no-logs-message">
          <p>No weight logs found.</p>
          <p>Start tracking your weight by clicking the "Log Weight" button.</p>
        </div>
      ) : (
        <>
          <div className="weight-summary">
            <div className="summary-card">
              <h3>Current Weight</h3>
              <div className="summary-value">
                {weightLogs[weightLogs.length - 1].weight} lbs
              </div>
            </div>
            {getWeightChange() && (
              <div className="summary-card">
                <h3>Weight Change (Past Week)</h3>
                <div className="summary-value">
                  {getWeightChange().value} lbs {getWeightChange().direction}
                </div>
              </div>
            )}
          </div>

          <div className="chart-container">
            <div className="chart-header">
              <h3>Weight Trend</h3>
              <div className="date-range-selector">
                <button
                  className={`range-button ${
                    dateRange === "1m" ? "active" : ""
                  }`}
                  onClick={() => setDateRange("1m")}
                >
                  1 Month
                </button>
                <button
                  className={`range-button ${
                    dateRange === "3m" ? "active" : ""
                  }`}
                  onClick={() => setDateRange("3m")}
                >
                  3 Months
                </button>
                <button
                  className={`range-button ${
                    dateRange === "6m" ? "active" : ""
                  }`}
                  onClick={() => setDateRange("6m")}
                >
                  6 Months
                </button>
                <button
                  className={`range-button ${
                    dateRange === "1y" ? "active" : ""
                  }`}
                  onClick={() => setDateRange("1y")}
                >
                  1 Year
                </button>
                <button
                  className={`range-button ${
                    dateRange === "all" ? "active" : ""
                  }`}
                  onClick={() => setDateRange("all")}
                >
                  All Time
                </button>
              </div>
            </div>
            <div className="chart-wrapper">
              <Line data={getChartData()} options={chartOptions} height={300} />
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default WeightProgress;
