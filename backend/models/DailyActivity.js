const mongoose = require('mongoose');

const FoodItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: String, default: '1 serving' },
  calories: { type: Number, default: 0 },
  consumed: { type: Boolean, default: false },
  isPrescribed: { type: Boolean, default: false },
  protein: Number,
  carbs: Number,
  fat: Number
});

const DailyActivityWorkoutSchema = new mongoose.Schema({
  id: String,
  title: String,
  category: String,
  notes: String,
  exercises: [{
    exerciseName: String,
    sets: Number,
    reps: Number,
    time: String,
    rest: String,
    notes: String,
    completed: { type: Boolean, default: false }
  }]
});

const DailyActivitySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  date: {
    type: String, // format YYYY-MM-DD
    required: true
  },
  workoutGoals: {
    pushups: {
      target: { type: Number, default: 100 },
      completed: { type: Number, default: 0 },
      done: { type: Boolean, default: false },
      caloriesBurned: { type: Number, default: 0 }
    },
    steps: {
      target: { type: Number, default: 10000 },
      completed: { type: Number, default: 0 },
      done: { type: Boolean, default: false },
      caloriesBurned: { type: Number, default: 0 }
    }
  },
  meals: {
    breakfast: {
      items: [FoodItemSchema],
      completed: { type: Boolean, default: false }
    },
    lunch: {
      items: [FoodItemSchema],
      completed: { type: Boolean, default: false }
    },
    dinner: {
      items: [FoodItemSchema],
      completed: { type: Boolean, default: false }
    },
    snacks: {
      items: [FoodItemSchema],
      completed: { type: Boolean, default: false }
    },
    shake: {
      items: [FoodItemSchema],
      completed: { type: Boolean, default: false }
    }
  },
  weight: Number,
  caloriesConsumed: { type: Number, default: 0 },
  caloriesBurned: { type: Number, default: 0 },
  sleepHours: { type: Number, default: 0 },
  waterIntake: { type: Number, default: 0 },
  todayWorkouts: [DailyActivityWorkoutSchema],
  cheatMeals: {
    fastFood: { type: Boolean, default: false },
    sweets: { type: Boolean, default: false },
    sugaryDrinks: { type: Boolean, default: false },
    snacking: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Ensure a user has exactly one entry per date
DailyActivitySchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyActivity', DailyActivitySchema);
