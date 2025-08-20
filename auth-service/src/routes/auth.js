const express = require('express');
const jwt = require('jsonwebtoken');
const  {limitlogin} = require('../common/rate-limit')
const {registerUser,loginUser} = require('../controller/auth-controller')
const router = express.Router();

// Register
router.post('/register',registerUser );

// Login
router.post('/login',limitlogin,loginUser );

module.exports = router;
