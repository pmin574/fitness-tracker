import { exerciseList } from "../data/exerciseList";

/**
 * Find matching exercises for autocomplete
 * @param {string} input - User input string
 * @returns {string[]} Array of matching exercises
 */
export const findMatchingExercises = (input) => {
  if (!input) return [];

  const lowerInput = input.toLowerCase();
  return exerciseList
    .filter((exercise) => exercise.toLowerCase().includes(lowerInput))
    .slice(0, 5); // Limit to 5 results
};

// Common exercises that should be prioritized in matching
const commonExercises = [
  "Barbell Squat",
  "Barbell Deadlift",
  "Barbell Bench Press",
  "Barbell Overhead Press",
  "Pull-Up",
  "Chin-Up",
  "Push-Up",
  "Dumbbell Bench Press",
  "Dumbbell Shoulder Press",
  "Dumbbell Lateral Raise",
  "Dumbbell Curl",
  "Hammer Curl",
  "Skull Crushers",
  "Triceps Pushdown",
  "Lat Pulldown",
  "Seated Cable Row",
  "Barbell Row",
  "Face Pull",
  "Dumbbell Row",
  "Cable Crossover",
  "Pec Deck Machine",
  "Leg Press",
  "Walking Lunge",
  "Goblet Squat",
  "Dumbbell Romanian Deadlift",
  "Hip Thrust",
  "Glute Bridge",
  "Leg Curl Machine",
  "Leg Extension Machine",
  "Calf Raise",
  "Plank",
  "Russian Twist",
  "Hanging Leg Raise",
  "Weighted Sit-Up",
  "Kettlebell Swing",
  "Box Jump",
  "Battle Ropes",
  "Jump Rope",
  "Step-Up",
  "Bulgarian Split Squat",
  "Cable Crunch",
  "Sled Push",
  "Inverted Row",
  "Dip",
  "Incline Barbell Bench Press",
  "Incline Dumbbell Press",
  "Decline Bench Press",
  "Barbell Curl",
  "Trap Bar Deadlift",
  "Farmer's Walk",
];

/**
 * Find the closest matching exercise from the list
 * @param {string} input - User input string
 * @returns {string} The closest matching exercise name
 */
export const findClosestExercise = (input) => {
  if (!input) return "";

  const lowerInput = input.toLowerCase();

  // Try exact match first
  const exactMatch = exerciseList.find(
    (exercise) => exercise.toLowerCase() === lowerInput
  );
  if (exactMatch) return exactMatch;

  // Try partial match
  const matches = exerciseList.filter((exercise) =>
    exercise.toLowerCase().includes(lowerInput)
  );

  if (matches.length > 0) {
    // Check if any common exercises match
    const commonMatches = matches.filter((match) =>
      commonExercises.some(
        (common) =>
          common.toLowerCase() === match.toLowerCase() ||
          common.toLowerCase().includes(match.toLowerCase()) ||
          match.toLowerCase().includes(common.toLowerCase())
      )
    );

    // If we have common matches, prioritize them
    if (commonMatches.length > 0) {
      // Sort by shortest name first (most direct match)
      return commonMatches.sort((a, b) => a.length - b.length)[0];
    }

    // Otherwise, return the shortest match as before
    return matches.sort((a, b) => a.length - b.length)[0];
  }

  // If no matches, return the original input
  return input;
};
