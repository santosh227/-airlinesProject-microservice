const { StatusCodes } = require('http-status-codes');

const infoController = (req, res) => {
    return res.status(StatusCodes.OK).json({
        success: true,
        message: 'API is live',
        error: {},
        data: {},
    });
}

module.exports = {
    infoController
}