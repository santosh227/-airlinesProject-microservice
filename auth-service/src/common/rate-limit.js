const rateLimit = require('express-rate-limit')

const limitlogin = rateLimit({
    windowMS : 15 * 60 * 1000, // 15 minutes
    max : 5 ,
    message : "too many request try to login after 15 min "
})

module.exports = {limitlogin}