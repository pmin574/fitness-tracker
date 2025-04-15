import { exerciseList } from "../data/exerciseList";

/**
 * Find matching exercises for autocomplete
 * @param {string} input - User input string
 * @returns {string[]} Array of matching exercises
 */
export const findMatchingExercises = (input) => {
  if (!input) return [];

  const lowerInput = input.toLowerCase();

  // Split the input into individual words
  const searchWords = lowerInput.split(/\s+/).filter((word) => word.length > 0);

  // Get exercises that contain all search words (in any order)
  const matches = exerciseList.filter((exercise) => {
    const lowerExercise = exercise.toLowerCase();
    // Check if all search words are present in the exercise name
    return searchWords.every((word) => lowerExercise.includes(word));
  });

  // Sort matches with multiple criteria:
  // 1. Common exercises first
  // 2. Exercises that start with the search term
  // 3. Exercises where search term is a complete word
  // 4. Alphabetical order
  const sortedMatches = matches.sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();

    // Check if exercises are in the common list
    const aIsCommon = commonExercises.some(
      (common) => common.toLowerCase() === aLower
    );
    const bIsCommon = commonExercises.some(
      (common) => common.toLowerCase() === bLower
    );

    // Check if exercises start with the input
    const aStartsWith = aLower.startsWith(lowerInput);
    const bStartsWith = bLower.startsWith(lowerInput);

    // Check if input is a whole word in the exercise name
    // Instead of checking the whole phrase, check individual words
    let aWordMatches = 0;
    let bWordMatches = 0;

    // Count how many search words are complete words in each exercise
    searchWords.forEach((word) => {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const wordRegex = new RegExp(`\\b${escapedWord}\\b`, "i");

      if (wordRegex.test(aLower)) aWordMatches++;
      if (wordRegex.test(bLower)) bWordMatches++;
    });

    // Check for exact phrase match (highest priority)
    const aContainsExactPhrase = aLower.includes(lowerInput);
    const bContainsExactPhrase = bLower.includes(lowerInput);

    // If one contains the exact search phrase and the other doesn't
    if (aContainsExactPhrase !== bContainsExactPhrase) {
      return aContainsExactPhrase ? -1 : 1;
    }

    // If one is common and the other isn't
    if (aIsCommon !== bIsCommon) {
      return aIsCommon ? -1 : 1;
    }

    // If both are common or both are not common, check if they start with the input
    if (aStartsWith !== bStartsWith) {
      return aStartsWith ? -1 : 1;
    }

    // If one has more whole word matches than the other
    if (aWordMatches !== bWordMatches) {
      return aWordMatches > bWordMatches ? -1 : 1;
    }

    // If we get here, sort alphabetically
    return a.localeCompare(b);
  });

  return sortedMatches.slice(0, 8); // Show more results (up to 8)
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
