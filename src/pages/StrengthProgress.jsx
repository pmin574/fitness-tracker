import React, { useState, useEffect, useRef } from "react";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import "../styles/ProgressPages.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";
import { Tooltip as ReactTooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  Filler,
  BarElement,
} from "chart.js";
import { Line as ChartLine, Bar as ChartBar } from "react-chartjs-2";
import {
  format,
  parseISO,
  isValid,
  startOfWeek,
  startOfMonth,
  subMonths,
  isSameDay,
  differenceInCalendarDays,
  startOfYear,
  endOfYear,
  addYears,
  subYears,
} from "date-fns";
import { motion } from "framer-motion";
import { FiCalendar, FiTrendingUp, FiArrowLeft } from "react-icons/fi";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  ChartLegend,
  Filler
);

const StrengthProgress = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [summaryMetrics, setSummaryMetrics] = useState({
    totalWorkouts: 0,
    totalExercises: 0,
    totalSets: 0,
    totalWeight: 0,
  });
  const [exerciseList, setExerciseList] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeReps, setActiveReps] = useState("all");
  const dropdownRef = useRef(null);
  const [heatmapYear, setHeatmapYear] = useState(new Date().getFullYear());
  const [volumeRange, setVolumeRange] = useState("3months");
  const [calendarData, setCalendarData] = useState([]);
  const [exerciseChartData, setExerciseChartData] = useState([]);
  const [filterType, setFilterType] = useState("range"); // "range", "specific", or "all"
  const [repRangeFilter, setRepRangeFilter] = useState("1-5");
  const [specificRepFilter, setSpecificRepFilter] = useState(5);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef(null);
  const [heatMapData, setHeatMapData] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [dateRange, setDateRange] = useState("3m"); // Options: "1m", "3m", "6m", "1y", "all"
  const [volumeChartData, setVolumeChartData] = useState([]);
  const [filteredExercises, setFilteredExercises] = useState([]);

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
          const workouts = userData.workouts || [];
          setWorkouts(workouts);
          calculateSummaryMetrics(workouts);
          extractUniqueExercises(workouts);
        } else {
          setWorkouts([]);
          setExerciseList([]);
          setSummaryMetrics({
            totalWorkouts: 0,
            totalExercises: 0,
            totalSets: 0,
            totalWeight: 0,
          });
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

  const calculateSummaryMetrics = (workouts) => {
    if (!workouts.length) {
      return setSummaryMetrics({
        totalWorkouts: 0,
        totalExercises: 0,
        totalSets: 0,
        totalWeight: 0,
      });
    }

    const sortedWorkouts = [...workouts].sort((a, b) => {
      const parseDate = (dateStr) => {
        if (
          typeof dateStr === "string" &&
          dateStr.match(/^\d{4}-\d{2}-\d{2}$/)
        ) {
          const [year, month, day] = dateStr.split("-").map(Number);
          return new Date(year, month - 1, day);
        }
        if (typeof dateStr === "object" && dateStr.seconds) {
          return new Date(dateStr.seconds * 1000);
        }
        return new Date(dateStr);
      };
      return parseDate(a.date) - parseDate(b.date);
    });

    const totalWorkouts = workouts.length;

    // Track unique exercise names
    const uniqueExercises = new Set();
    let totalSets = 0;
    let totalWeight = 0;

    workouts.forEach((workout) => {
      if (workout.exercises && Array.isArray(workout.exercises)) {
        workout.exercises.forEach((exercise) => {
          // Add exercise name to set of unique exercises if it exists
          if (exercise.name?.trim()) {
            uniqueExercises.add(exercise.name.trim().toLowerCase());
          }

          if (exercise.sets && Array.isArray(exercise.sets)) {
            totalSets += exercise.sets.length;
            exercise.sets.forEach((set) => {
              const reps = parseInt(set.reps) || 0;
              const weight =
                set.weight === "bodyweight" ? 155 : parseInt(set.weight) || 0;
              totalWeight += reps * weight;
            });
          }
        });
      }
    });

    const newestFirst = [...sortedWorkouts].reverse();
    const lastWorkoutDate = newestFirst[0]?.date
      ? formatDate(newestFirst[0].date)
      : "N/A";

    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    if (sortedWorkouts.length === 1) {
      const weeklyFrequency = 1;
      setSummaryMetrics({
        totalWorkouts,
        totalExercises: uniqueExercises.size,
        totalSets,
        totalWeight,
      });
      return;
    }

    const oldestWorkoutDate = sortedWorkouts[0].date?.seconds
      ? new Date(sortedWorkouts[0].date.seconds * 1000)
      : new Date(sortedWorkouts[0].date);

    const accountAgeInWeeks = Math.max(
      1,
      Math.ceil((new Date() - oldestWorkoutDate) / (7 * 24 * 60 * 60 * 1000))
    );

    const weeksToUse = Math.min(4, accountAgeInWeeks);

    const recentWorkouts = newestFirst.filter((workout) => {
      const workoutDate = workout.date?.seconds
        ? new Date(workout.date.seconds * 1000)
        : new Date(workout.date);

      if (accountAgeInWeeks >= 4) {
        return workoutDate >= fourWeeksAgo;
      }
      return true;
    });

    const weeklyFrequency = +(recentWorkouts.length / weeksToUse).toFixed(1);

    setSummaryMetrics({
      totalWorkouts,
      totalExercises: uniqueExercises.size,
      totalSets,
      totalWeight,
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown Date";

    // For Firebase timestamp objects
    if (typeof dateString === "object" && dateString.seconds) {
      const date = new Date(dateString.seconds * 1000);
      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    }

    // For ISO date strings (YYYY-MM-DD)
    if (
      typeof dateString === "string" &&
      dateString.match(/^\d{4}-\d{2}-\d{2}$/)
    ) {
      const [year, month, day] = dateString.split("-");
      return `${month}/${day}/${year}`;
    }

    // For JavaScript Date objects or other date strings
    try {
      const date = new Date(dateString);
      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    } catch (e) {
      return dateString;
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

  const extractUniqueExercises = (workouts) => {
    const exerciseMap = new Map();

    workouts.forEach((workout) => {
      if (workout.exercises && Array.isArray(workout.exercises)) {
        workout.exercises.forEach((exercise) => {
          const name = exercise.name?.trim();
          if (name) {
            if (
              !exerciseMap.has(name) ||
              exercise.sets.length > exerciseMap.get(name).setCount
            ) {
              exerciseMap.set(name, {
                name: name,
                setCount: exercise.sets?.length || 0,
                firstDate: exerciseMap.has(name)
                  ? exerciseMap.get(name).firstDate
                  : new Date(workout.date),
              });
            }
          }
        });
      }
    });

    const sortedExercises = Array.from(exerciseMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    setExerciseList(sortedExercises);
  };

  const handleExerciseSelect = (exercise) => {
    if (exercise === "none") {
      setSelectedExercise(null);
    } else {
      setSelectedExercise({ ...exercise });
      setFilterType("all");
    }
    setDropdownOpen(false);
    setSearchTerm("");
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target)
      ) {
        setFilterDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const prepareChartData = () => {
    if (!selectedExercise || !workouts.length) return;

    // Array to store all matching sets
    const allSets = [];

    // Sort workouts by date (oldest to newest)
    const sortedWorkouts = [...workouts].sort((a, b) => {
      return parseDate(a.date) - parseDate(b.date);
    });

    // Process each workout for the selected exercise
    sortedWorkouts.forEach((workout) => {
      if (!workout.exercises || !Array.isArray(workout.exercises)) return;

      const exerciseEntry = workout.exercises.find(
        (ex) =>
          ex.name?.trim().toLowerCase() === selectedExercise.name.toLowerCase()
      );

      if (
        !exerciseEntry ||
        !exerciseEntry.sets ||
        !Array.isArray(exerciseEntry.sets)
      )
        return;

      // Filter sets based on rep range, specific rep count, or show all
      const filteredSets = exerciseEntry.sets.filter((set) => {
        const reps = parseInt(set.reps) || 0;

        if (filterType === "all") {
          return true; // Include all sets
        } else if (filterType === "range") {
          const [min, max] = repRangeFilter.split("-").map(Number);
          return reps >= min && reps <= max;
        } else {
          // For specific rep counts
          return reps === parseInt(filterType);
        }
      });

      // Skip if no sets match the filter criteria
      if (filteredSets.length === 0) return;

      // Format date for display
      const formattedDate = formatDate(workout.date);

      // Add each set as a separate data point
      filteredSets.forEach((set, index) => {
        const weight =
          set.weight === "bodyweight" ? 155 : parseInt(set.weight) || 0;
        const reps = parseInt(set.reps) || 0;

        if (weight > 0) {
          allSets.push({
            date: formattedDate,
            weight: weight,
            reps: reps,
            setLabel: `Set ${index + 1}`,
            rawDate: workout.date, // Keep raw date for sorting
          });
        }
      });
    });

    // Sort by date to ensure chronological order
    allSets.sort((a, b) => {
      return parseDate(a.rawDate) - parseDate(b.rawDate);
    });

    setExerciseChartData(allSets);
  };

  const prepareHeatMapData = () => {
    if (!selectedExercise || !workouts.length) {
      setHeatMapData([]);
      return;
    }

    // Find all years in workout data for the selected exercise
    const years = new Set();
    const heatMapCounts = {};

    workouts.forEach((workout) => {
      if (!workout.exercises || !Array.isArray(workout.exercises)) return;

      const exerciseEntry = workout.exercises.find(
        (ex) =>
          ex.name?.trim().toLowerCase() === selectedExercise.name.toLowerCase()
      );

      if (!exerciseEntry) return;

      // Parse the date
      let workoutDate;
      if (typeof workout.date === "object" && workout.date.seconds) {
        workoutDate = new Date(workout.date.seconds * 1000);
      } else if (
        typeof workout.date === "string" &&
        workout.date.match(/^\d{4}-\d{2}-\d{2}$/)
      ) {
        const [year, month, day] = workout.date.split("-").map(Number);
        workoutDate = new Date(year, month - 1, day);
      } else {
        workoutDate = new Date(workout.date);
      }

      const year = workoutDate.getFullYear();
      years.add(year);

      // Create date string in YYYY-MM-DD format
      const dateStr = `${year}-${String(workoutDate.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(workoutDate.getDate()).padStart(2, "0")}`;

      if (!heatMapCounts[dateStr]) {
        heatMapCounts[dateStr] = 0;
      }
      // Count sets performed for this exercise on this date
      if (exerciseEntry.sets && Array.isArray(exerciseEntry.sets)) {
        heatMapCounts[dateStr] += exerciseEntry.sets.length;
      } else {
        heatMapCounts[dateStr] += 1; // At least the exercise was done
      }
    });

    // Update available years
    const yearsArray = Array.from(years).sort();
    setAvailableYears(yearsArray);

    // If no years found or selected year not in available years, update selected year
    if (yearsArray.length > 0 && !yearsArray.includes(heatmapYear)) {
      setHeatmapYear(yearsArray[yearsArray.length - 1]); // Set to most recent year
    }

    // Create heat map data array for the selected year
    const startDate = new Date(heatmapYear, 0, 1);
    const endDate = new Date(heatmapYear, 11, 31);

    const heatMapEntries = Object.entries(heatMapCounts)
      .filter(([dateStr]) => dateStr.startsWith(heatmapYear.toString()))
      .map(([date, count]) => ({ date, count }));

    setHeatMapData(heatMapEntries);
  };

  // Extract and prepare chart data for selected exercise
  useEffect(() => {
    if (selectedExercise && workouts.length > 0) {
      prepareChartData();
      prepareHeatMapData();
      prepareVolumeChartData();
    } else {
      setExerciseChartData([]);
      setHeatMapData([]);
      setVolumeChartData([]);
    }
  }, [
    selectedExercise,
    workouts,
    filterType,
    repRangeFilter,
    specificRepFilter,
  ]);

  // Update heat map when selected year changes
  useEffect(() => {
    if (selectedExercise && workouts.length > 0) {
      prepareHeatMapData();
    }
  }, [heatmapYear]);

  // Update filtered exercises whenever search term or exercise list changes
  useEffect(() => {
    const filtered = searchTerm
      ? exerciseList.filter((exercise) =>
          exercise.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : exerciseList;

    setFilteredExercises(filtered);
  }, [searchTerm, exerciseList]);

  const prepareVolumeChartData = () => {
    if (!selectedExercise || !workouts.length) {
      setVolumeChartData([]);
      return;
    }

    // Start date based on selected range
    const getStartDate = () => {
      const now = new Date();
      switch (dateRange) {
        case "1m":
          return new Date(now.setMonth(now.getMonth() - 1));
        case "3m":
          return new Date(now.setMonth(now.getMonth() - 3));
        case "6m":
          return new Date(now.setMonth(now.getMonth() - 6));
        case "1y":
          return new Date(now.setFullYear(now.getFullYear() - 1));
        case "all":
          return new Date(0); // Beginning of time
        default:
          return new Date(now.setMonth(now.getMonth() - 3));
      }
    };

    const startDate = getStartDate();

    // Get workouts for the selected exercise within the date range
    const filteredWorkouts = workouts
      .filter((workout) => {
        // Parse workout date
        let workoutDate;
        if (typeof workout.date === "object" && workout.date.seconds) {
          workoutDate = new Date(workout.date.seconds * 1000);
        } else if (
          typeof workout.date === "string" &&
          workout.date.match(/^\d{4}-\d{2}-\d{2}$/)
        ) {
          const [year, month, day] = workout.date.split("-").map(Number);
          workoutDate = new Date(year, month - 1, day);
        } else {
          workoutDate = new Date(workout.date);
        }

        // Check if the workout has the selected exercise and is within date range
        const hasSelectedExercise = workout.exercises?.some(
          (ex) =>
            ex.name?.trim().toLowerCase() ===
            selectedExercise.name.toLowerCase()
        );
        return hasSelectedExercise && workoutDate >= startDate;
      })
      .sort((a, b) => parseDate(a.date) - parseDate(b.date));

    // Calculate total volume for the selected exercise in each workout
    const volumeData = filteredWorkouts.map((workout) => {
      // Find the exercise entry in this workout
      const exerciseEntry = workout.exercises.find(
        (ex) =>
          ex.name?.trim().toLowerCase() === selectedExercise.name.toLowerCase()
      );

      // Calculate volume for all sets (weight * reps)
      let volume = 0;
      if (exerciseEntry?.sets && Array.isArray(exerciseEntry.sets)) {
        volume = exerciseEntry.sets.reduce((total, set) => {
          const weight =
            set.weight === "bodyweight" ? 155 : parseInt(set.weight) || 0;
          const reps = parseInt(set.reps) || 0;
          return total + weight * reps;
        }, 0);
      }

      // Format the date for display
      const formattedDate = formatDate(workout.date);

      return {
        date: formattedDate,
        volume: volume,
        rawDate: workout.date,
      };
    });

    setVolumeChartData(volumeData);
  };

  // Update volume chart data based on current range and workout changes
  useEffect(() => {
    if (selectedExercise && workouts.length > 0) {
      prepareVolumeChartData();
    }
  }, [dateRange, volumeRange, workouts, selectedExercise]);

  const handleBack = () => {
    navigate("/progress-tracker");
  };

  const handleYearChange = (year) => {
    setHeatmapYear(year);
  };

  const getTooltipDataAttr = (value) => {
    if (!value || !value.date) {
      return {
        "data-tooltip-id": "heatmap-tooltip",
        "data-tooltip-content": "No activity",
      };
    }

    // Format date for better display
    const dateObj = new Date(value.date);
    const formattedDate = dateObj.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    return {
      "data-tooltip-id": "heatmap-tooltip",
      "data-tooltip-content": `${formattedDate}: ${value.count} set${
        value.count !== 1 ? "s" : ""
      }`,
    };
  };

  const getClassForValue = (value) => {
    if (!value || !value.count) {
      return "color-empty";
    }
    if (value.count === 1) {
      return "color-scale-1";
    } else if (value.count <= 3) {
      return "color-scale-2";
    } else if (value.count <= 5) {
      return "color-scale-3";
    } else {
      return "color-scale-4";
    }
  };

  const formatDateTooltip = (dateStr) => {
    // For ISO date strings (YYYY-MM-DD)
    if (typeof dateStr === "string" && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return dateStr;
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="progress-page-container error">{error}</div>;
  }

  return (
    <motion.div
      className="progress-page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="progress-page-header">
        <button className="back-button" onClick={handleBack}>
          <FiArrowLeft size={20} style={{ marginRight: "8px" }} />
          Back
        </button>
        <h2>Strength Progress</h2>
      </div>

      <div className="summary-metrics">
        <div className="metric-card">
          <h3>Total Workouts</h3>
          <div className="metric-value">{summaryMetrics.totalWorkouts}</div>
          <div className="metric-label">workouts</div>
        </div>

        <div className="metric-card">
          <h3>Total Exercises</h3>
          <div className="metric-value">{summaryMetrics.totalExercises}</div>
          <div className="metric-label">exercises</div>
        </div>

        <div className="metric-card">
          <h3>Total Sets</h3>
          <div className="metric-value">{summaryMetrics.totalSets}</div>
          <div className="metric-label">sets</div>
        </div>

        <div className="metric-card">
          <h3>Total Weight</h3>
          <div className="metric-value">
            {summaryMetrics.totalWeight.toLocaleString()}
          </div>
          <div className="metric-label">pounds lifted</div>
        </div>
      </div>

      <div className="exercise-tracking-section">
        <h3 className="section-title">Exercise Progress Tracking</h3>
        <p className="selection-help">
          Select an exercise to view detailed progress over time, including max
          weights and workout frequency.
        </p>

        <div className="exercise-dropdown-container" ref={dropdownRef}>
          <div
            className="exercise-dropdown-header"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <span className="selected-exercise-name">
              {selectedExercise ? selectedExercise.name : "Select an exercise"}
            </span>
            <span
              className="dropdown-arrow"
              style={{
                transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              ▼
            </span>
          </div>

          {dropdownOpen && (
            <div className="exercise-dropdown-menu">
              <div className="exercise-search-container">
                <input
                  type="text"
                  className="exercise-search-input"
                  placeholder="Search exercises..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="exercise-dropdown-items">
                {filteredExercises.length > 0 ? (
                  filteredExercises.map((exercise, index) => (
                    <div
                      key={index}
                      className={`exercise-dropdown-item ${
                        selectedExercise === exercise ? "selected" : ""
                      }`}
                      onClick={() => handleExerciseSelect(exercise)}
                    >
                      {exercise.name}
                    </div>
                  ))
                ) : (
                  <div className="no-exercise-matches">No matches found</div>
                )}
              </div>
            </div>
          )}
        </div>

        {selectedExercise ? (
          <div className="exercise-details">
            <h3 className="exercise-title">{selectedExercise.name}</h3>

            <div
              className="charts-container"
              style={{ flexDirection: "column" }}
            >
              <div
                className="exercise-chart-container"
                style={{ width: "100%", marginBottom: "30px" }}
              >
                <div className="filter-controls">
                  <h4 className="chart-title">
                    Weight Progression
                    <span
                      className={`filter-badge ${
                        filterType === "all" ? "all-reps" : ""
                      }`}
                    >
                      {filterType === "all" ? "All Reps" : `${filterType} Reps`}
                    </span>
                  </h4>

                  <div className="filter-dropdown">
                    <div
                      className="filter-dropdown-header"
                      onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                    >
                      Filter by Reps
                      <span className="dropdown-arrow">▼</span>
                    </div>

                    {filterDropdownOpen && (
                      <div
                        className="filter-dropdown-content"
                        ref={filterDropdownRef}
                      >
                        <div className="filter-options">
                          <div className="filter-column">
                            <h4>Rep Ranges</h4>
                            <ul>
                              <li
                                className={filterType === "all" ? "active" : ""}
                                onClick={() => {
                                  setFilterType("all");
                                  setFilterDropdownOpen(false);
                                }}
                              >
                                All Reps
                              </li>
                              {[
                                "1-5",
                                "5-8",
                                "5-10",
                                "8-10",
                                "8-12",
                                "10-12",
                                "10-15",
                                "15-20",
                              ].map((range) => (
                                <li
                                  key={range}
                                  className={
                                    filterType === "range" &&
                                    repRangeFilter === range
                                      ? "active"
                                      : ""
                                  }
                                  onClick={() => {
                                    setFilterType("range");
                                    setRepRangeFilter(range);
                                    setFilterDropdownOpen(false);
                                  }}
                                >
                                  {range} Reps
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="filter-column">
                            <h4>Specific Reps</h4>
                            <ul className="specific-reps-list">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15].map(
                                (rep) => (
                                  <li
                                    key={rep}
                                    className={
                                      filterType === rep.toString()
                                        ? "active"
                                        : ""
                                    }
                                    onClick={() => {
                                      setFilterType(rep.toString());
                                      setFilterDropdownOpen(false);
                                    }}
                                  >
                                    {rep}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {exerciseChartData.length > 0 ? (
                  <div style={{ height: "280px" }}>
                    <ChartLine
                      data={{
                        labels: exerciseChartData.map((item) => item.date),
                        datasets: [
                          {
                            label: "Weight (lbs)",
                            data: exerciseChartData.map((item) => item.weight),
                            borderColor: "rgba(255, 87, 34, 1)",
                            backgroundColor: "rgba(255, 87, 34, 0.7)",
                            fill: false,
                            tension: 0.3,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: "top",
                            labels: {
                              boxWidth: 15,
                              font: {
                                size: 13,
                              },
                            },
                          },
                          tooltip: {
                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                            titleColor: "#333",
                            bodyColor: "#555",
                            bodyFont: {
                              size: 14,
                            },
                            padding: 12,
                            cornerRadius: 6,
                            borderColor: "rgba(0, 0, 0, 0.1)",
                            borderWidth: 1,
                            displayColors: false,
                            callbacks: {
                              title: function (context) {
                                return context[0].label;
                              },
                              label: function (context) {
                                const item =
                                  exerciseChartData[context.dataIndex];
                                return [
                                  `Weight: ${item.weight} lbs`,
                                  `Reps: ${item.reps}`,
                                  `Set: ${item.setLabel}`,
                                ];
                              },
                            },
                          },
                        },
                        scales: {
                          x: {
                            grid: {
                              display: false,
                            },
                            ticks: {
                              maxRotation: 45,
                              minRotation: 45,
                            },
                          },
                          y: {
                            beginAtZero: false,
                            title: {
                              display: true,
                              text: "Weight (lbs)",
                              color: "#666",
                              font: {
                                size: 13,
                              },
                            },
                            grid: {
                              color: "rgba(0, 0, 0, 0.05)",
                            },
                          },
                        },
                        elements: {
                          line: {
                            tension: 0.3,
                          },
                        },
                      }}
                    />
                  </div>
                ) : (
                  <div className="no-chart-data">
                    <p>No data available for the selected filters</p>
                    <p>Try selecting a different rep range or exercise</p>
                  </div>
                )}
              </div>

              <div
                className="exercise-volume-container"
                style={{ width: "100%" }}
              >
                <div className="volume-header">
                  <h3>Volume Progress</h3>
                  <div className="date-range-selector">
                    <button
                      className={`range-button ${
                        dateRange === "1m" ? "active" : ""
                      }`}
                      onClick={() => handleDateRangeChange("1m")}
                    >
                      1 Month
                    </button>
                    <button
                      className={`range-button ${
                        dateRange === "3m" ? "active" : ""
                      }`}
                      onClick={() => handleDateRangeChange("3m")}
                    >
                      3 Months
                    </button>
                    <button
                      className={`range-button ${
                        dateRange === "6m" ? "active" : ""
                      }`}
                      onClick={() => handleDateRangeChange("6m")}
                    >
                      6 Months
                    </button>
                    <button
                      className={`range-button ${
                        dateRange === "1y" ? "active" : ""
                      }`}
                      onClick={() => handleDateRangeChange("1y")}
                    >
                      1 Year
                    </button>
                  </div>
                </div>
                <p className="volume-description">
                  Total workout volume (weight × reps) over time. Higher volume
                  generally indicates increased work capacity and strength
                  endurance.
                </p>

                {volumeChartData && volumeChartData.length > 0 ? (
                  <div className="volume-chart-wrapper">
                    <ChartBar
                      data={{
                        labels: volumeChartData.map((item) => item.date),
                        datasets: [
                          {
                            label: "Volume",
                            data: volumeChartData.map((item) => item.volume),
                            backgroundColor: "rgba(255, 87, 34, 0.7)",
                            borderColor: "rgba(255, 87, 34, 1)",
                            borderWidth: 1,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false,
                          },
                          tooltip: {
                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                            titleColor: "#333",
                            bodyColor: "#555",
                            bodyFont: {
                              size: 14,
                            },
                            padding: 12,
                            cornerRadius: 6,
                            borderColor: "rgba(0, 0, 0, 0.1)",
                            borderWidth: 1,
                            displayColors: false,
                            callbacks: {
                              label: function (context) {
                                return `Volume: ${context.parsed.y.toLocaleString()} lbs`;
                              },
                            },
                          },
                        },
                        scales: {
                          x: {
                            grid: {
                              display: false,
                            },
                          },
                          y: {
                            beginAtZero: true,
                            title: {
                              display: true,
                              text: "Volume (lbs)",
                              color: "#666",
                            },
                            grid: {
                              color: "rgba(0, 0, 0, 0.05)",
                            },
                          },
                        },
                      }}
                    />
                  </div>
                ) : (
                  <div className="no-chart-data">
                    <p>No volume data available for this timeframe</p>
                    <p>Try selecting a different time range</p>
                  </div>
                )}
              </div>
            </div>

            <div className="exercise-heatmap-container">
              <div className="heatmap-header">
                <div>
                  <h3>Workout Frequency & Intensity</h3>
                  <p className="heatmap-description">
                    This calendar shows when you trained{" "}
                    <strong>{selectedExercise.name}</strong> and the intensity
                    (volume) of each workout. Darker colors indicate higher
                    volume.
                  </p>
                </div>
                <div className="year-selector">
                  {Array.from(
                    new Set([
                      ...workouts
                        .filter((w) => {
                          // Find this exercise in the workout
                          return w.exercises?.some(
                            (ex) =>
                              ex.name?.toLowerCase() ===
                              selectedExercise.name.toLowerCase()
                          );
                        })
                        .map((w) => {
                          // Extract just the year from the workout date
                          const date = parseDate(w.date);
                          return date.getFullYear();
                        }),
                      // Ensure current year is always included
                      new Date().getFullYear(),
                    ])
                  )
                    .sort((a, b) => b - a) // Sort descending (newest first)
                    .slice(0, 5) // Show at most 5 years
                    .map((year) => (
                      <button
                        key={year}
                        className={`year-button ${
                          heatmapYear === year ? "active" : ""
                        }`}
                        onClick={() => handleYearChange(year)}
                      >
                        {year}
                      </button>
                    ))}
                </div>
              </div>

              <div className="calendar-heatmap-wrapper">
                <CalendarHeatmap
                  startDate={new Date(`${heatmapYear}-01-01`)}
                  endDate={new Date(`${heatmapYear}-12-31`)}
                  values={heatMapData}
                  classForValue={(value) =>
                    value ? getClassForValue(value) : "color-empty"
                  }
                  tooltipDataAttrs={(value) => {
                    if (!value || !value.date) {
                      return { "data-tip": "No workout" };
                    }
                    return {
                      "data-tip": `${formatDateTooltip(
                        value.date
                      )}: ${value.count.toLocaleString()} lbs`,
                    };
                  }}
                  showWeekdayLabels={true}
                  monthLabels={[
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                  ]}
                />
              </div>

              <div className="heatmap-legend">
                <span className="legend-label">Volume:</span>
                <div className="legend-scale">
                  <div className="legend-item color-empty"></div>
                  <span className="legend-label">None</span>
                </div>
                <div className="legend-scale">
                  <div className="legend-item color-scale-1"></div>
                  <span className="legend-label">Low</span>
                </div>
                <div className="legend-scale">
                  <div className="legend-item color-scale-2"></div>
                  <span className="legend-label">Medium</span>
                </div>
                <div className="legend-scale">
                  <div className="legend-item color-scale-3"></div>
                  <span className="legend-label">High</span>
                </div>
                <div className="legend-scale">
                  <div className="legend-item color-scale-4"></div>
                  <span className="legend-label">Max</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="exercise-prompt">
            <p>
              <FiTrendingUp
                size={40}
                style={{ color: "var(--primary-orange)", marginBottom: "15px" }}
              />
            </p>
            <p>
              <strong>Select an exercise</strong> from the dropdown above to
              view your progress.
            </p>
            <p>
              You'll see your weight progression, volume trends, and training
              frequency.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default StrengthProgress;
