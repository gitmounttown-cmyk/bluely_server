// const jwt = require('jsonwebtoken');

// const verifyToken = (req, res, next) => {
//   let token = req.headers.authorization;
//   if (token && token.startsWith('Bearer')) {
//     try {
//       token = token.split(' ')[1];
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       req.user = decoded; // { id, role, email, ... }
//       next();
//     } catch (error) {
//       return res.status(401).json({ 
//         success: false, 
//         message: 'Not authorized, token failed' 
//       });
//     }
//   } else {
//     return res.status(401).json({ 
//       success: false, 
//       message: 'Not authorized, no token provided' 
//     });
//   }
// };

// // Case-insensitive role verification
// const allowRoles = (...roles) => {
//   return (req, res, next) => {
//     const userRole = req.user?.role?.toLowerCase();
//     const allowed = roles.map(r => r.toLowerCase());

//     if (req.user && allowed.includes(userRole)) {
//       next();
//     } else {
//       return res.status(403).json({ 
//         success: false, 
//         message: `Access denied: Requires one of roles: ${roles.join(', ')}` 
//       });
//     }
//   };
// };

// module.exports = { verifyToken, allowRoles };

const jwt = require('jsonwebtoken');

// Strict token verification (Blocks unauthenticated users)
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

/**
 * Optional token verification: 
 * Allows BOTH logged-in users and guest users.
 * If a valid token is provided, req.user is set. Otherwise, req.user is null/undefined and request continues.
 */
const verifyTokenOptional = (req, res, next) => {
  let token = req.headers.authorization;
  if (token && token.startsWith('Bearer')) {
    try {
      token = token.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // Attached if valid
    } catch (error) {
      // Invalid token provided, treat as guest rather than throwing 401
      req.user = null;
    }
  } else {
    // No token provided, treat as guest
    req.user = null;
  }
  next();
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

module.exports = { verifyToken, verifyTokenOptional, allowRoles };