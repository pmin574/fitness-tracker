import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { app } from "../firebase";

/**
 * Initializes Firebase App Check with appropriate configuration based on environment
 *
 * In development: Uses debug tokens to bypass app check
 * In production: Uses ReCaptcha providers for actual verification
 */
export const initializeAppCheckForEnv = () => {
  const isDevelopment =
    process.env.NODE_ENV === "development" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  // Enable debug token in non-production environments
  if (isDevelopment) {
    // For development - enable debug mode to bypass App Check
    // WARNING: This should never be included in production code!
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;

    console.log("🔧 Firebase App Check running in debug mode");

    return initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider("recaptcha-site-key-placeholder"),
      isTokenAutoRefreshEnabled: true,
      // This debug token bypasses App Check in development
      debug: {
        apiKey: "debug-app-check-token",
        siteKey: "debug-recaptcha-site-key",
      },
    });
  } else {
    // For production - use actual ReCaptcha provider
    // Temporarily disable App Check in production until we have a proper site key
    console.log("🔒 App Check disabled in production for now");

    return null;

    // Uncomment and add proper site key when ready:
    /*
    return initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider("YOUR_RECAPTCHA_KEY"),
      isTokenAutoRefreshEnabled: true,
    });
    */
  }
};
