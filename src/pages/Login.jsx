import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "../firebase";
import "../styles/Login.css";

function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check for redirect result on component mount
    const checkRedirectResult = async () => {
      try {
        setIsLoading(true);
        const result = await getRedirectResult(auth);
        if (result) {
          // User successfully authenticated after redirect
          const user = result.user;
          await createUserDocument(user);
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Error processing redirect result:", error);
        if (error.code === "auth/unauthorized-domain") {
          setError(
            "This domain is not authorized for Firebase Authentication. Please check Firebase Console settings."
          );
        } else {
          setError(`Authentication error: ${error.message}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkRedirectResult();

    // Also check if user is already logged in
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigate("/dashboard");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Create a new user document in Firestore if it doesn't exist
  const createUserDocument = async (user) => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    // If user document doesn't exist, create it
    if (!userSnap.exists()) {
      try {
        await setDoc(userRef, {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
          workouts: [],
          exercises: [],
          goals: [],
          weightLogs: [],
        });
        console.log("New user document created!");
      } catch (error) {
        console.error("Error creating user document:", error);
        throw error; // Rethrow to handle in the calling function
      }
    }
  };

  const handleGoogleSignIn = () => {
    setError(null);
    setIsLoading(true);

    try {
      // Use redirect instead of popup
      signInWithRedirect(auth, googleProvider);
      // The page will redirect to Google for authentication
      // After auth, the browser will redirect back and useEffect will handle the result
    } catch (error) {
      console.error("Error initiating Google sign-in:", error);
      setError(`Authentication error: ${error.message}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="app-logo">
          <div className="logo-icon">NR</div>
          <h1>NextRep</h1>
        </div>
        <h2>Track Your Fitness Journey</h2>
        <p className="login-description">
          Log workouts, track your progress, and achieve your fitness goals with
          NextRep.
        </p>

        {error && <div className="error-message">{error}</div>}

        <button
          className="login-button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          {!isLoading ? (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                width="24px"
                height="24px"
              >
                <path
                  fill="#FFC107"
                  d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                />
                <path
                  fill="#4CAF50"
                  d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                />
              </svg>
              Sign in with Google
            </>
          ) : (
            "Signing in..."
          )}
        </button>

        <div className="login-footer">
          Start tracking your fitness journey today
        </div>
      </div>
      <div className="login-background-decoration"></div>
    </div>
  );
}

export default Login;
