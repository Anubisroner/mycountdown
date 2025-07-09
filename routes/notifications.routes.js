const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const User = require("../models/user.model"); // nécessaire pour retrouver le username
const jwt = require("jsonwebtoken");

// ✅ Inscription à la newsletter
router.post("/", async (req, res) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: "Token manquant." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.userId;

    const { email } = req.body;

    if (!email || !userId) {
      return res.status(400).json({ message: "Champs requis manquants." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const username = user.username;

    const alreadyExists = await Notification.findOne({ userId, email });
    if (alreadyExists) {
      return res.status(400).json({ message: "Déjà inscrit à la newsletter." });
    }

    await Notification.create({ userId, username, email });
    res.json({ message: "Inscription réussie à la newsletter." });

  } catch (err) {
    console.error("Erreur inscription newsletter :", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// ❌ Désinscription
router.delete("/:userId", async (req, res) => {
  try {
    const deleted = await Notification.findOneAndDelete({ userId: req.params.userId });
    if (!deleted) return res.status(404).json({ message: "Aucune inscription trouvée" });
    res.json({ message: "Désinscription réussie" });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// 🔍 Statut d’abonnement
router.get("/status/:userId", async (req, res) => {
  try {
    const notif = await Notification.findOne({ userId: req.params.userId });
    if (!notif) return res.status(200).json({ subscribed: false });
    res.json({ subscribed: true, email: notif.email });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;
