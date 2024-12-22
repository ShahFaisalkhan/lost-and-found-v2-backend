// File: backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt'); // For hashing passwords
const jwt = require('jsonwebtoken'); // For creating JWT tokens
const User = require('../models/User'); // User model

const router = express.Router();

// Register a new user
// sign up with better error handling
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if the email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered' });
    }
     // Hash the password before saving
//     // const hashedPassword = await bcrypt.hash(password, 10);
//     // Create a new user with the hashed password
//     // const newUser = new User({ username, email, password: hashedPassword });
    // Create a new user (with plain password, if required)
    const newUser = new User({ username, email, password });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error("Error in backend:", error.message);

    // Differentiate between known and unexpected errors
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: 'Validation error: Invalid input' });
    }

    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// Login user
// Modified code with better error handling
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email' }); // Explicit message for invalid email
    }
    // Validate the password
//     // const isPasswordValid = await bcrypt.compare(password, user.password);
//     // if (!isPasswordValid) {
//     //   return res.status(401).json({ message: 'Invalid email or password' });
//     // }
    // Validate the password (plain text comparison)
    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid password' }); // Explicit message for invalid password
    }

    // Generate a JWT token
    const payload = {
      id: user._id,
      role: user.role, // Include the role in the token
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ message: 'Login successful', token }); // Include success message in response
  } catch (error) {
    console.error('Error during login:', error.message);

    // Differentiate between known and unexpected errors
    if (error.name === 'ValidationError') {
      res.status(400).json({ message: 'Validation error: Invalid input' });
    } else {
      res.status(500).json({ message: 'Server error. Please try again later.' });
    }
  }
});

// Fetch the logged-in user's profile
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Decode the token
    const user = await User.findById(decoded.id).select('-password'); // Exclude the password from the response

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user); // Send the user profile
  } catch (err) {
    console.error('Error fetching profile:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// Update User Profile
router.put('/profile', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Decode the token
    const userId = decoded.id;

    // Fetch the user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Update fields
    const { username, email, currentPassword, newPassword } = req.body;

    if (username) user.username = username;
    if (email) user.email = email;

    // If the user wants to update the password
    // if (currentPassword && newPassword) {
    //   const isMatch = await bcrypt.compare(currentPassword, user.password);
    //   if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    //   const salt = await bcrypt.genSalt(10);
    //   user.password = await bcrypt.hash(newPassword, salt);
    // }
    // Update password without hashing
    if (currentPassword && newPassword) {
      // Directly compare the current password in plain text
      if (currentPassword !== user.password) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      user.password = newPassword; // Set the new password in plain text
    }
    const updatedUser = await user.save(); // Save updated user
    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (err) {
    console.error('Error updating profile:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;

