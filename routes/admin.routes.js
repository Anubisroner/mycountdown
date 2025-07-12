const express = require("express");
const router = express.Router();
const User = require("../models/user.model");
const Release = require("../models/release.model");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.JWT_SECRET;

// 🔒 Middleware : vérifie que l'utilisateur est admin via token
async function checkAdmin(req, res, next) {
  const authHeader = req.headers["authorization"];

  console.log("🛡️ Vérification admin - Token :", authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token manquant ou invalide" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await User.findById(decoded.userId || decoded.id);

    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("❌ Erreur vérification token admin :", err.message);
    return res.status(403).json({ message: "Token invalide ou expiré" });
  }
}

// ✅ GET /api/admin/users — liste tous les utilisateurs (admin uniquement)
router.get("/users", checkAdmin, async (req, res) => {
  try {
    const users = await User.find({}, "username isAdmin").lean();

    const counts = await Release.aggregate([
      { $group: { _id: "$userId", count: { $sum: 1 } } }
    ]);

    const countMap = {};
    counts.forEach(c => {
      countMap[c._id?.toString()] = c.count;
    });

    const result = users.map(user => ({
      ...user,
      count: countMap[user._id?.toString()] || 0
    }));

    res.json(result);
  } catch (err) {
    console.error("❌ Erreur GET /admin/users :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;
