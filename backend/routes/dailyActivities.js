const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const DailyActivity = require('../models/DailyActivity');
const DietPlan = require('../models/DietPlan');

// @route   GET api/daily-activities/:userId
// @desc    Get all daily activities for a user
// @access  Private
router.get('/:userId', auth, async (req, res) => {
  try {
    const activities = await DailyActivity.find({ userId: req.params.userId }).sort({ date: 1 });
    res.json(activities);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/daily-activities/:userId/today
// @desc    Get or initialize today's activity log
// @access  Private
router.get('/:userId/today', auth, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  try {
    let activity = await DailyActivity.findOne({ userId: req.params.userId, date: today });
    if (activity) {
      return res.json(activity);
    }

    const dietPlan = await DietPlan.findOne({ userId: req.params.userId });
    const markAsPrescribed = (items) => {
      if (!items) return [];
      return items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        isPrescribed: true,
        consumed: false
      }));
    };

    activity = new DailyActivity({
      userId: req.params.userId,
      date: today,
      workoutGoals: {
        pushups: { target: 100, completed: 0, done: false, caloriesBurned: 0 },
        steps: { target: 10000, completed: 0, done: false, caloriesBurned: 0 }
      },
      meals: {
        breakfast: { items: markAsPrescribed(dietPlan?.breakfast), completed: false },
        lunch: { items: markAsPrescribed(dietPlan?.lunch), completed: false },
        dinner: { items: markAsPrescribed(dietPlan?.dinner), completed: false },
        snacks: { items: markAsPrescribed(dietPlan?.snacks), completed: false },
        shake: { items: markAsPrescribed(dietPlan?.shake), completed: false }
      },
      caloriesConsumed: 0,
      caloriesBurned: 0,
      sleepHours: 0,
      waterIntake: 0,
      todayWorkouts: [],
      cheatMeals: {
        fastFood: false,
        sweets: false,
        sugaryDrinks: false,
        snacking: false
      }
    });

    await activity.save();
    res.json(activity);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/daily-activities/:userId
// @desc    Save daily activity updates
// @access  Private
router.post('/:userId', auth, async (req, res) => {
  const { date } = req.body;

  try {
    let activity = await DailyActivity.findOne({ userId: req.params.userId, date });

    if (activity) {
      activity = await DailyActivity.findOneAndUpdate(
        { userId: req.params.userId, date },
        { $set: req.body },
        { new: true }
      );
      return res.json(activity);
    }

    activity = new DailyActivity({
      userId: req.params.userId,
      ...req.body
    });
    await activity.save();
    res.json(activity);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
