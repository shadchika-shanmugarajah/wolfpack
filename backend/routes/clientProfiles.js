const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ClientProfile = require('../models/ClientProfile');

// @route   GET api/client-profiles/:userId
// @desc    Get client profile by user ID
// @access  Private
router.get('/:userId', auth, async (req, res) => {
  try {
    const profile = await ClientProfile.findOne({ userId: req.params.userId });
    if (!profile) {
      return res.status(404).json({ msg: 'Profile not found' });
    }
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/client-profiles
// @desc    Create or update client profile
// @access  Private
router.post('/', auth, async (req, res) => {
  const {
    userId,
    weight,
    height,
    bmi,
    allergies,
    medicalConditions,
    foodPreferences,
    pastInjuries,
    fitnessGoal,
    workoutLocation,
    goalWeight
  } = req.body;

  const profileFields = {
    userId,
    weight,
    height,
    bmi,
    allergies,
    medicalConditions,
    foodPreferences,
    pastInjuries,
    fitnessGoal,
    workoutLocation,
    goalWeight
  };

  try {
    let profile = await ClientProfile.findOne({ userId });

    if (profile) {
      profile = await ClientProfile.findOneAndUpdate(
        { userId },
        { $set: profileFields },
        { new: true }
      );
      return res.json(profile);
    }

    profile = new ClientProfile(profileFields);
    await profile.save();
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
