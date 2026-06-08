const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const DietPlan = require('../models/DietPlan');

// @route   GET api/diet-plans/:userId
// @desc    Get diet plan by user ID
// @access  Private
router.get('/:userId', auth, async (req, res) => {
  try {
    const plan = await DietPlan.findOne({ userId: req.params.userId });
    if (!plan) {
      return res.status(404).json({ msg: 'Diet plan not found' });
    }
    res.json(plan);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/diet-plans
// @desc    Create or update diet plan (Admin only)
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied: Trainer privilege required' });
    }

    const { userId } = req.body;
    let plan = await DietPlan.findOne({ userId });

    if (plan) {
      plan = await DietPlan.findOneAndUpdate(
        { userId },
        { $set: req.body },
        { new: true }
      );
      return res.json(plan);
    }

    plan = new DietPlan(req.body);
    await plan.save();
    res.json(plan);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
