const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const User = require("../models/user.model");
const verifyToken = require("../middlewares/authMiddleware");
const jwt = require("jsonwebtoken");

router.post("/", verifyToken, async (req, res) => {
  try {
    const { email } = req.body;
    const { userId } = req.user;

    if (!email || !userId) {
      return res.status(400).json({ message: "Email ou utilisateur manquant." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const alreadyExists = await Notification.findOne({ userId, email });
    if (alreadyExists) {
      return res.status(400).json({ message: "Déjà inscrit à la newsletter." });
    }

    await Notification.create({ userId, username: user.username, email });
    res.json({ message: "Inscription réussie à la newsletter." });
  } catch (err) {
    console.error("Erreur inscription newsletter :", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

router.delete("/:userId", async (req, res) => {
  try {
    const deleted = await Notification.findOneAndDelete({ userId: req.params.userId });
    if (!deleted) return res.status(404).json({ message: "Aucune inscription trouvée" });
    res.json({ message: "Désinscription réussie" });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

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
