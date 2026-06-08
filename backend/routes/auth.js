const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const User = require('../models/User');

// @route   POST api/auth/register
// @desc    Register a new client
// @access  Public
router.post('/register', async (req, res) => {
  const { email, password, fullName, age, address, sexuality, phoneNumber } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({
      email,
      password,
      fullName,
      age,
      address,
      sexuality,
      phoneNumber,
      role: 'client',
      approved: false,
      profileComplete: false,
      approvalStatus: 'none',
      dietPlanAssigned: false
    });

    await user.save();

    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/auth/me
// @desc    Get current user details
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/auth/users
// @desc    Get all users (Admin only)
// @access  Private
router.get('/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied: Trainer privilege required' });
    }
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/auth/users/:userId
// @desc    Update user profile data
// @access  Private
router.put('/users/:userId', auth, async (req, res) => {
  try {
    if (req.user.id !== req.params.userId && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const updateFields = { ...req.body };
    delete updateFields.password; // Ignore password change in this route
    delete updateFields.role;     // Ignore role change

    let user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: updateFields },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/approve/:userId
// @desc    Approve client signup (Admin only)
// @access  Private
router.post('/approve/:userId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied: Trainer privilege required' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: { approved: true, approvalStatus: 'approved' } },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/reject/:userId
// @desc    Reject client signup (Admin only)
// @access  Private
router.post('/reject/:userId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied: Trainer privilege required' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: { approved: false, approvalStatus: 'rejected' } },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/submit-approval/:userId
// @desc    Submit approval request (Client finished profile setup)
// @access  Private
router.post('/submit-approval/:userId', auth, async (req, res) => {
  try {
    if (req.user.id !== req.params.userId) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: { profileComplete: true, approved: false, approvalStatus: 'pending' } },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/mark-diet-assigned/:userId
// @desc    Mark diet plan assigned to client (Admin only)
// @access  Private
router.post('/mark-diet-assigned/:userId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied: Trainer privilege required' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: { dietPlanAssigned: true } },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
