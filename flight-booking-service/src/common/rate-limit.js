const ratelimit = require('express-rate-limit')


const limiter = ratelimit({
    WindowMS : 15 * 60 * 1000, 
    max : 3,
    message: {
    success: false,
    message: "Too many booking attempts. Please wait 10 minutes before trying again.",
    error: "RATE_LIMIT_EXCEEDED",
    retryAfter: "15 minutes"
  },
})

module.exports = limiter