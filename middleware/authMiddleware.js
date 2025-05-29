const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your_jwt_secret_key'; 

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 

  if (!token) return res.status(401).json({ error: 'Missing token' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });

    req.user = user; 
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Access denied – Admins only' });
  }
  next();
}

module.exports = {
  authenticateToken,
  requireAdmin
};
