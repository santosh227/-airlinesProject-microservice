const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const {registerUser,loginUser} = require('../controller/auth-controller')
const router = express.Router();

// Register
router.post('/register',registerUser );

// Login
router.post('/login',loginUser );

module.exports = router;
