const mongoose = require('mongoose');

const ExerciseSchema = new mongoose.Schema({
  exerciseName: { type: String, required: true },
  sets: { type: Number, default: 3 },
  reps: { type: Number, default: 10 },
  time: { type: String, default: 'N/A' },
  rest: { type: String, default: '60s' },
  notes: String
});

const AssignedWorkoutSchema = new mongoose.Schema({
  id: { type: String, required: true },
  templateId: String,
  title: { type: String, required: true },
  category: String,
  notes: String,
  exercises: [ExerciseSchema]
});

const DayWorkoutSchema = new mongoose.Schema({
  dayName: { type: String, required: true },
  workouts: [AssignedWorkoutSchema]
});

const WorkoutPlanSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  stepsTarget: {
    type: Number,
    default: 10000
  },
  days: [DayWorkoutSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('WorkoutPlan', WorkoutPlanSchema);
