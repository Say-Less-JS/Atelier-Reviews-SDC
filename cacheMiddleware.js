const cache = require('memory-cache');
const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    const key = '__express__' + req.originalUrl || req.url;
    const cachedBody = cache.get(key);
    if (cachedBody) {
      res.send(cachedBody);
      return;
    } else {
      // Store the original send function
      const originalSend = res.send.bind(res);

      // Override the send function
      res.send = (body) => {
        cache.put(key, body, duration * 1000);
        originalSend(body);
      };

      next();
    }
  };
};

module.exports = cacheMiddleware;