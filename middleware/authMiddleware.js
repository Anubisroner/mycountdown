const jwt = require("jsonwebtoken");

module.exports = async function verifyToken(req, res, next) {
  const token = req.headers.authorization;

  if (!token) return res.status(401).json({ message: "Token manquant" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // contient { userId, isAdmin }
    next();
  } catch (err) {
    res.status(403).json({ message: "Token invalide", error: err.message });
  }
};
