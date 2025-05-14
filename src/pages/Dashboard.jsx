import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
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
import "../styles/Dashboard.css";

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

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalVolume: 0,
    totalWeightLogs: 0,
    weightChange: null,
    lastWorkout: {
      date: null,
      name: null,
    },
    currentWeight: null,
    recentWorkouts: [],
    recentWeights: [],
  });
  const [weightData, setWeightData] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
        fetchDashboardData(user.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchDashboardData = async (userId) => {
    try {
      // Get user data to fetch workouts and weight logs
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        console.error("User document does not exist");
        return;
      }

      const userData = userDoc.data();
      const workouts = userData.workouts || [];
      const weightLogs = userData.weightLogs || [];

      // Sort workouts by date (newest first)
      const sortedWorkouts = [...workouts].sort((a, b) => {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        return dateB - dateA;
      });

      // Sort weight logs by date (newest first)
      const sortedWeightLogs = [...weightLogs].sort((a, b) => {
        const aDate = parseDate(a.date);
        const bDate = parseDate(b.date);
        return bDate - aDate;
      });

      // Get the most recent bodyweight, or use 155 as default if none exists
      let currentBodyweight = 155;
      if (sortedWeightLogs.length > 0) {
        currentBodyweight = sortedWeightLogs[0].weight;
      }

      // Calculate total volume
      let totalVolume = 0;
      sortedWorkouts.forEach((workout) => {
        if (workout.exercises && Array.isArray(workout.exercises)) {
          workout.exercises.forEach((exercise) => {
            if (exercise.sets && Array.isArray(exercise.sets)) {
              exercise.sets.forEach((set) => {
                const reps = parseInt(set.reps) || 0;
                let weight;
                if (
                  set.weight === "bodyweight" ||
                  set.weight === "🏋️‍♀️ bodyweight"
                ) {
                  weight = Math.round(currentBodyweight * 0.25); // Use quarter of bodyweight
                } else {
                  weight = parseInt(set.weight) || 0;
                }
                totalVolume += reps * weight;
              });
            }
          });
        }
      });

      // Calculate weight change
      const calculateWeightTrend = (weightLogs) => {
        if (!weightLogs || weightLogs.length < 2) {
          return null;
        }

        // Get current date and start of week (Sunday)
        const now = new Date();
        const currentWeekStart = new Date(now);
        currentWeekStart.setDate(now.getDate() - now.getDay()); // Go back to Sunday
        currentWeekStart.setHours(0, 0, 0, 0); // Start of day

        // Get weekly logs (current week only)
        const currentWeekLogs = weightLogs.filter((log) => {
          const logDate = parseDate(log.date);
          return logDate >= currentWeekStart;
        });

        // If we have at least 2 logs in the current week, calculate that trend
        if (currentWeekLogs.length >= 2) {
          const firstOfWeek =
            currentWeekLogs[currentWeekLogs.length - 1].weight;
          const latestOfWeek = currentWeekLogs[0].weight;
          return latestOfWeek - firstOfWeek;
        }

        // Fallback: If not enough entries in current week, use the most recent two entries
        if (weightLogs.length >= 2) {
          const latestWeight = weightLogs[0].weight;
          const secondLatestWeight = weightLogs[1].weight;
          return latestWeight - secondLatestWeight;
        }

        return null;
      };

      // Prepare weight data for chart (reversed to show oldest to newest)
      const chartData = [...sortedWeightLogs]
        .reverse()
        .slice(-10) // Show last 10 entries for the chart
        .map((log) => ({
          date: formatDate(log.date),
          weight: log.weight,
        }));

      setWeightData(chartData);

      // Calculate the weekly weight trend
      const weeklyWeightChange = calculateWeightTrend(sortedWeightLogs);

      setStats({
        totalWorkouts: workouts.length,
        totalVolume,
        totalWeightLogs: weightLogs.length,
        weightChange: weeklyWeightChange,
        lastWorkout:
          sortedWorkouts.length > 0
            ? {
                date: formatDateShort(sortedWorkouts[0].date),
                name: sortedWorkouts[0].name || "Unnamed Workout",
              }
            : { date: null, name: null },
        currentWeight:
          sortedWeightLogs.length > 0 ? sortedWeightLogs[0].weight : null,
        recentWorkouts: sortedWorkouts.slice(0, 4),
        recentWeights: sortedWeightLogs.slice(0, 3),
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  const parseDate = (dateStr) => {
    if (typeof dateStr === "object" && dateStr.seconds) {
      return new Date(dateStr.seconds * 1000);
    }
    if (typeof dateStr === "string" && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date(dateStr);
  };

  const formatDate = (dateString) => {
    const date = parseDate(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatDateFull = (dateString) => {
    const date = parseDate(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateShort = (dateString) => {
    const date = parseDate(dateString);
    return `${date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  };

  const weightChartData = {
    labels: weightData.map((d) => d.date),
    datasets: [
      {
        label: "Weight (lbs)",
        data: weightData.map((d) => d.weight),
        borderColor: "#FF5722",
        backgroundColor: "rgba(255, 87, 34, 0.1)",
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        titleColor: "#333",
        bodyColor: "#666",
        borderColor: "rgba(0, 0, 0, 0.1)",
        borderWidth: 1,
        padding: 8,
        displayColors: false,
        callbacks: {
          label: function (context) {
            return `${context.parsed.y} lbs`;
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
        ticks: {
          font: {
            size: 10,
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 10,
          },
        },
      },
    },
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <div className="dashboard-logo">NR</div>
          <h1>Next Rep</h1>
        </div>
        <div className="welcome-text">
          Welcome Back, {user?.displayName?.split(" ")[0] || "Parker"}
        </div>

        <div className="quick-actions">
          <button
            onClick={() => navigate("/log-workout")}
            className="action-btn"
          >
            Log Workout
          </button>
          <button
            onClick={() => navigate("/log-weight")}
            className="action-btn"
          >
            Log Weight
          </button>
          <button
            onClick={() => navigate("/progress-tracker")}
            className="action-btn"
          >
            Progress
          </button>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-title">Total Workouts</div>
          <div className="stat-value">{stats.totalWorkouts}</div>
        </div>

        <div className="stat-card">
          <div className="stat-title">Total Volume</div>
          <div className="stat-value">
            {Math.floor(stats.totalVolume).toLocaleString()}
            <span className="stat-unit">lbs</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-title">Total Weight Logs</div>
          <div className="stat-value">{stats.totalWeightLogs}</div>
        </div>

        <div className="stat-card">
          <div className="stat-title">
            Weekly Weight Trend
            <span
              className="info-tooltip"
              title="Calculated from your first and most recent weight logs of the current week. If you have fewer than 2 logs this week, it shows the change between your last two entries."
            >
              ⓘ
                </span>
              </div>
          <div className="stat-value weight-trend">
            {stats.weightChange !== null ? (
              <span
                className={stats.weightChange > 0 ? "positive" : "negative"}
              >
                {stats.weightChange > 0 ? "+" : ""}
                {stats.weightChange}
                <span className="stat-unit">lbs</span>
                </span>
            ) : (
              "No data"
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-title">Last Workout</div>
          <div className="stat-value last-workout">
            {stats.lastWorkout.date ? (
              <>
                <div className="workout-date">{stats.lastWorkout.date}</div>
                <div className="workout-name">"{stats.lastWorkout.name}"</div>
              </>
            ) : (
              "No workouts"
            )}
              </div>
              </div>
            </div>

      <div className="dashboard-sections">
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Strength Training</h2>
          </div>
          <div className="section-content">
            <div className="section-buttons">
              <button
                onClick={() => navigate("/log-workout")}
                className="section-btn"
              >
                Log Workout
              </button>
              <button
                onClick={() => navigate("/workout-history")}
                className="section-btn"
              >
                Workout History
              </button>
              <button
                onClick={() => navigate("/strength-progress")}
                className="section-btn"
              >
                Strength Progress
              </button>
            </div>

            <div className="section-list">
              <h3>Recent Workouts</h3>
              {stats.recentWorkouts.length > 0 ? (
                <div className="workout-list">
                  {stats.recentWorkouts.map((workout, index) => (
                    <div
                      key={index}
                      className="workout-item clickable"
                      onClick={() =>
                        navigate("/workout-history", {
                          state: {
                            selectedWorkout: {
                              ...workout,
                              id: index.toString(),
                            },
                          },
                        })
                      }
                    >
                      <div className="workout-date">
                        {formatDateShort(workout.date)}
                      </div>
                      <div className="workout-name">
                        "{workout.name || `Push Day ${index + 3}`}"
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-list">No recent workouts</div>
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <div className="section-header">
            <h2>Body Weight</h2>
          </div>
          <div className="section-content">
            <div className="section-buttons">
              <button
                onClick={() => navigate("/log-weight")}
                className="section-btn"
              >
                Log Weight
              </button>
              <button
                onClick={() => navigate("/weight-history")}
                className="section-btn"
              >
                Weight History
              </button>
              <button
                onClick={() => navigate("/weight-progress")}
                className="section-btn"
              >
                Weight Progress
              </button>
            </div>

            <div className="weight-chart-container">
              <h3>Weight Over Time</h3>
              {weightData.length > 1 ? (
                <div className="weight-chart">
                  <Line
                    data={weightChartData}
                    options={chartOptions}
                    height={180}
                  />
              </div>
              ) : (
                <div className="empty-chart">
                  Not enough data to display chart
                </div>
              )}
            </div>

            <div className="current-weight">
              <h3>Current Weight</h3>
              <div className="current-weight-value">
                {stats.currentWeight ? (
                  <>
                    {stats.currentWeight}
                    <span className="stat-unit">lbs</span>
                  </>
                ) : (
                  "No data"
                )}
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
