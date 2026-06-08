const mongoose = require('mongoose');

const ExerciseSchema = new mongoose.Schema({
  exerciseName: { type: String, required: true },
  sets: { type: Number, default: 3 },
  reps: { type: Number, default: 10 },
  time: { type: String, default: 'N/A' },
  rest: { type: String, default: '60s' },
  notes: String
});

const WorkoutTemplateSchema = new mongoose.Schema({
  folderId: {
    type: String, // String for compatibility with templates seeds
    default: ''
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  notes: String,
  exercises: [ExerciseSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('WorkoutTemplate', WorkoutTemplateSchema);
