const mongoose = require('mongoose');

const ClientProfileSchema = new mongoose.Schema({
  userId: {
    type: String, // String format for compatibility with client IDs
    required: true,
    unique: true
  },
  weight: Number,
  height: Number,
  bmi: Number,
  allergies: [String],
  medicalConditions: String,
  foodPreferences: String,
  pastInjuries: String,
  fitnessGoal: String,
  workoutLocation: String,
  goalWeight: Number
}, {
  timestamps: true
});

module.exports = mongoose.model('ClientProfile', ClientProfileSchema);
