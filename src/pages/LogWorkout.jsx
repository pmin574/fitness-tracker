<div className="set-inputs">
  <div className="form-group">
    <label htmlFor={`reps-${exercise.id}-${set.id}`}>Reps</label>
    <input
      type="number"
      id={`reps-${exercise.id}-${set.id}`}
      value={set.reps}
      onChange={(e) => {
        let val = e.target.value;
        // Only allow positive whole numbers
        if (val !== "" && !/^\d+$/.test(val)) return;
        // Limit to reasonable range (1-1000)
        if (val !== "" && (parseInt(val) < 1 || parseInt(val) > 1000)) return;
        handleSetChange(exercise.id, set.id, "reps", val);
      }}
      onKeyDown={(e) => {
        // Prevent e, E, +, -, . and any other non-digit characters
        if (
          !/^\d$/.test(e.key) &&
          !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(
            e.key
          )
        ) {
          e.preventDefault();
        }
      }}
      placeholder="e.g., 10"
      min="1"
      max="1000"
      step="1"
      required
    />
  </div>
  <div className="form-group">
    <label htmlFor={`weight-${exercise.id}-${set.id}`}>Weight</label>
    <input
      type="number"
      id={`weight-${exercise.id}-${set.id}`}
      value={set.weight}
      onChange={(e) => {
        let val = e.target.value;
        if (set.weight === "🏋️‍♀️ bodyweight") return;
        // Only allow positive numbers with up to 1 decimal place
        if (val !== "" && !/^\d*\.?\d{0,1}$/.test(val)) return;
        // Limit to reasonable range (0.1-1000)
        if (val !== "" && (parseFloat(val) < 0.1 || parseFloat(val) > 1000))
          return;
        handleSetChange(exercise.id, set.id, "weight", val);
      }}
      onKeyDown={(e) => {
        // Allow only digits, one decimal point, and control keys
        if (
          !/^[\d.]$/.test(e.key) &&
          !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(
            e.key
          )
        ) {
          e.preventDefault();
        }
        // Prevent multiple decimal points
        if (e.key === "." && e.target.value.includes(".")) {
          e.preventDefault();
        }
      }}
      placeholder={
        set.weight === "🏋️‍♀️ bodyweight" ? "Bodyweight" : "e.g., 135.5"
      }
      min="0.1"
      max="1000"
      step="0.1"
      required={set.weight !== "🏋️‍♀️ bodyweight"}
      readOnly={set.weight === "🏋️‍♀️ bodyweight"}
      className={set.weight === "🏋️‍♀️ bodyweight" ? "bodyweight-input" : ""}
    />
  </div>
</div>;
