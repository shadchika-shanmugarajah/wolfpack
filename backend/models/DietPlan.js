const mongoose = require('mongoose');

const FoodItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: String, default: '1 serving' },
  calories: { type: Number, default: 0 },
  protein: Number,
  carbs: Number,
  fat: Number
});

const DietPlanSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  breakfast: [FoodItemSchema],
  lunch: [FoodItemSchema],
  dinner: [FoodItemSchema],
  snacks: [FoodItemSchema],
  shake: [FoodItemSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('DietPlan', DietPlanSchema);
