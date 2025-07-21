// ✅ Define and export the middleware directly
const middleware_airplane = (req, res, next) => {
  const { model, capacity } = req.body;

  if (!model || !capacity) {
    return res.status(400).json({
      success: false,
      message: 'Model and Capacity are required.',
    });
  }

  next();
};

module.exports = middleware_airplane;
