const crypto = require('crypto');

exports.hashRequest = (method, path, body, query) => {
  const normalized = JSON.stringify({
    method: method.toUpperCase(),
    path,
    body: body ?? {},
    query: query ?? {}
  });
  return crypto.createHash('sha256').update(normalized).digest('hex');
};
