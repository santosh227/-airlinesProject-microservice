const Idempotency = require('../models/Idempotency');
const { hashRequest } = require('../utils/hash');

const LOCK_WINDOW_MS = 30 * 1000; // adjust to avg booking time
const TTL_HOURS = 48;             // keep replayable result for 48h

function captureResponse(res, key) {
  const originalJson = res.json.bind(res);
  res.json = async (body) => {
    try {
      await Idempotency.updateOne(
        { key },
        {
          $set: {
            status: 'completed',
            responseStatus: res.statusCode,
            responseBody: body,
            lockedUntil: null
          }
        }
      );
    } catch (e) {
      console.error('Idempotency store error:', e);
    }
    return originalJson(body);
  };
}

module.exports = async function idempotency(req, res, next) {
  try {
    const method = req.method.toUpperCase();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next();
    }

    const key = req.get('Idempotency-Key');
    if (!key) {
      return res.status(400).json({ success: false, message: 'Idempotency-Key header required' });
    }

    const reqHash = hashRequest(method, req.path, req.body, req.query);
    const now = new Date();
    const lockUntil = new Date(now.getTime() + LOCK_WINDOW_MS);
    const expiresAt = new Date(now.getTime() + TTL_HOURS * 3600 * 1000);

    // First-time attempt: insert pending with lock
    try {
      await Idempotency.create({
        key,
        method,
        path: req.path,
        userId: req.user?.id, 
        requestHash: reqHash,
        status: 'pending',
        lockedUntil: lockUntil,
        expiresAt
      });
      captureResponse(res, key);
      return next();
    } catch (_) {
      
    }

    const record = await Idempotency.findOne({ key });
    if (!record) {
 
      captureResponse(res, key);
      return next();
    }

    if (record.requestHash !== reqHash) {
      return res.status(409).json({
        success: false,
        message: 'Idempotency key conflicts with different request payload'
      });
    }

    if (record.status === 'completed') {
      return res.status(record.responseStatus || 200).json(record.responseBody);
    }

    if (record.lockedUntil && record.lockedUntil > new Date()) {
      return res.status(409).json({
        success: false,
        message: 'Request with this Idempotency-Key is already processing'
      });
    }

    await Idempotency.updateOne(
      { key },
      { $set: { lockedUntil: lockUntil, status: 'pending' } }
    );

    captureResponse(res, key);
    return next();
  } catch (err) {
    console.error('Idempotency middleware error:', err);
    return res.status(500).json({ success: false, message: 'Idempotency middleware error' });
  }
};
