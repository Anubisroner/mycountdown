const jwt = require("jsonwebtoken");

module.exports = async function verifyToken(req, res, next) {
  console.log("🔐 Middleware Auth appelé");

  // 🔎 LOG COMPLET DES HEADERS
  console.log("📦 Tous les headers reçus :", req.headers);

  const authHeader = req.headers["authorization"];
  console.log("🧾 Header Authorization reçu :", authHeader);
  console.log("🔑 JWT_SECRET :", process.env.JWT_SECRET);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("❌ Token absent ou mal formé");
    return res.status(401).json({ message: "Token manquant ou invalide" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Token décodé :", decoded);

    req.user = {
      userId: decoded.userId || decoded.id,
      isAdmin: decoded.isAdmin || false
    };

    next();
  } catch (err) {
    console.log("❌ Erreur lors du décodage :", err.message);
    res.status(403).json({ message: "Token invalide", error: err.message });
  }
};
