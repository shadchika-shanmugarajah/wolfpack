const mongoose = require('mongoose');

const MonthlyMeasurementSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  month: {
    type: String, // format YYYY-MM
    required: true
  },
  height: { type: Number, required: true },
  weight: { type: Number, required: true },
  shoulder: { type: Number, default: 0 },
  chest: { type: Number, default: 0 },
  waist: { type: Number, default: 0 },
  belly: { type: Number, default: 0 },
  rightArm: { type: Number, default: 0 },
  leftArm: { type: Number, default: 0 },
  rightLeg: { type: Number, default: 0 },
  leftLeg: { type: Number, default: 0 },
  pushupCount: { type: Number, default: 0 },
  pullupCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Ensure a user has exactly one entry per month
MonthlyMeasurementSchema.index({ userId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('MonthlyMeasurement', MonthlyMeasurementSchema);
