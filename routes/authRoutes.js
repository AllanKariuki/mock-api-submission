const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, sequelize } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const { logger } = require('../services/loggingService');
const {Sequelize} = require("sequelize");
const { Op } = Sequelize;
const router = express.Router();

// User Registration
router.post('/register', [
  body('username').trim().isLength({ min: 3 }),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('phone_number')
], async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { username, email, password, phone_number } = req.body;
    console.log(req.body)

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      phone_number,
      account_balance: 0
    });

    // Log user registration
    logger.info(`User registered: ${username}`);

    res.status(201).json({
      message: 'User registered successfully',
      userId: user.id
    });
  } catch (error) {
    console.log(error)
    logger.error('Registration error', { error });
    res.status(500).json({ message: 'Server error during registration', error });
  }
});

// User Login
router.post('/login', [
  body('email').isEmail(),
  body('password').exists()
], async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;
    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Log successful login
    logger.info(`User logged in: ${email}`);

    res.json({
      token,
      userId: user.id
    });
  } catch (error) {
    logger.error('Login error', { error });
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get User Profile (Protected Route)
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: ['id', 'username', 'email', 'phone_number', 'account_balance']
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Profile fetch error', { error });
    res.status(500).json({ message: 'Server error fetching profile' });
  }
});

module.exports = router;