const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  let token = req.headers.authorization;
  if (token && token.startsWith('Bearer')) {
    try {
      token = token.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // { id, role, email, ... }
      next();
    } catch (error) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authorized, token failed' 
      });
    }
  } else {
    return res.status(401).json({ 
      success: false, 
      message: 'Not authorized, no token provided' 
    });
  }
};

// Case-insensitive role verification
const allowRoles = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role?.toLowerCase();
    const allowed = roles.map(r => r.toLowerCase());

    if (req.user && allowed.includes(userRole)) {
      next();
    } else {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied: Requires one of roles: ${roles.join(', ')}` 
      });
    }
  };
};

module.exports = { verifyToken, allowRoles };