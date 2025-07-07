const express = require("express");
const router = express.Router();
const User = require("../models/user.model");
const Release = require("../models/release.model");

// Vérifie si l'utilisateur est admin
async function checkAdmin(req, res, next) {
  const userId = req.headers["x-user-id"];
  if (!userId) return res.status(403).json({ message: "Non autorisé" });

  const user = await User.findById(userId);
  if (!user || !user.isAdmin) return res.status(403).json({ message: "Accès refusé" });

  next();
}

// ✅ GET /api/admin/users
router.get("/users", checkAdmin, async (req, res) => {
  try {
    const users = await User.find({}, "username isAdmin").lean();

    // Compte le nombre de contenus par user
    const counts = await Release.aggregate([
      { $group: { _id: "$userId", count: { $sum: 1 } } }
    ]);

    const countMap = {};
    counts.forEach(c => countMap[c._id] = c.count);

    const result = users.map(user => ({
      ...user,
      count: countMap[user._id?.toString()] || 0
    }));

    res.json(result);
  } catch (err) {
    console.error("Erreur GET /admin/users", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;
