import React from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import LogWorkout from "./pages/LogWorkout";
import WorkoutHistory from "./pages/WorkoutHistory";
import ProgressTracker from "./pages/ExerciseTracker";
import StrengthProgress from "./pages/StrengthProgress";
import WeightProgress from "./pages/WeightProgress";
import WeightHistory from "./pages/WeightHistory";
import LogWeight from "./pages/LogWeight";
import ProtectedRoute from "./components/ProtectedRoute";
import Header from "./components/Header";
import "./App.css";

function App() {
  return (
    <div className="App">
      <Router>
        <Header />
        <div className="content">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/log-workout"
              element={
                <ProtectedRoute>
                  <LogWorkout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workout-history"
              element={
                <ProtectedRoute>
                  <WorkoutHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/progress-tracker"
              element={
                <ProtectedRoute>
                  <ProgressTracker />
                </ProtectedRoute>
              }
            />
            <Route
              path="/strength-progress"
              element={
                <ProtectedRoute>
                  <StrengthProgress />
                </ProtectedRoute>
              }
            />
            <Route
              path="/weight-progress"
              element={
                <ProtectedRoute>
                  <WeightProgress />
                </ProtectedRoute>
              }
            />
            <Route
              path="/weight-history"
              element={
                <ProtectedRoute>
                  <WeightHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/log-weight"
              element={
                <ProtectedRoute>
                  <LogWeight />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </div>
  );
}

export default App;
