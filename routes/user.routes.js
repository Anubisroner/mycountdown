const express = require("express");
const router = express.Router();
const User = require("../models/user.model");
const Release = require("../models/release.model");
const bcrypt = require("bcrypt");
const axios = require("axios");


// ✅ Middleware pour vérifier si admin
async function isAdminMiddleware(req, res, next) {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ message: "Non autorisé" });

    const user = await User.findById(userId);
    if (!user || !user.isAdmin) return res.status(403).json({ message: "Accès réservé aux admins" });

    next();
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
}

// 🔐 INSCRIPTION
router.post("/register", async (req, res) => {
  const { username, password, token } = req.body;

  // ✅ Vérification reCAPTCHA
  if (!token) return res.status(400).json({ message: "Captcha requis." });

  const secretKey = process.env.RECAPTCHA_SECRET;

  try {
    const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify`, null, {
      params: {
        secret: secretKey,
        response: token
      }
    });

    if (!response.data.success) {
      return res.status(400).json({ message: "Échec du captcha." });
    }
  } catch (err) {
    return res.status(500).json({ message: "Erreur vérification captcha", error: err.message });
  }

  // ✅ Pseudo déjà utilisé (insensible à la casse)
  const exists = await User.findOne({ username: { $regex: new RegExp("^" + username + "$", "i") } });
  if (exists) return res.status(409).json({ message: "Pseudo déjà pris" });

  if (username.length > 15) {
    return res.status(400).json({ message: "Le pseudo ne doit pas dépasser 15 caractères." });
  }

  if (password.length < 8 || password.length > 20) {
    return res.status(400).json({ message: "Le mot de passe doit contenir entre 8 et 20 caractères." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await User.create({ username, password: hashedPassword });

  res.json({ message: "Inscription réussie" });
});

// 🔐 CONNEXION
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ message: "Identifiants incorrects" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ message: "Identifiants incorrects" });

  res.json({
    message: "Connexion réussie",
    userId: user._id,
    isAdmin: !!user.isAdmin
  });
});

// 👑 Admin - Liste des utilisateurs avec compteur de contenus
router.get("/admin/users", isAdminMiddleware, async (req, res) => {
  try {
    const users = await User.find().lean();
    const releases = await Release.find().lean();

    const result = users.map(user => {
      const count = releases.filter(r => r.userId.toString() === user._id.toString()).length;
      return {
        _id: user._id,
        username: user.username,
        count,
        isAdmin: user.isAdmin
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Erreur admin", error: err.message });
  }
});

// 🗑️ Supprimer uniquement l'utilisateur
router.delete("/admin/user/:id", isAdminMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    return res.json({ message: "Utilisateur supprimé" });
  } catch (err) {
    return res.status(500).json({ message: "Erreur suppression utilisateur", error: err.message });
  }
});

// 🧹 Supprimer uniquement les ajouts
router.delete("/admin/user/:id/releases", isAdminMiddleware, async (req, res) => {
  try {
    await Release.deleteMany({ userId: req.params.id });
    res.json({ message: "Ajouts supprimés" });
  } catch (err) {
    res.status(500).json({ message: "Erreur suppression ajouts", error: err.message });
  }
});

// 💣 Supprimer l'utilisateur + ses ajouts
router.delete("/admin/user/:id/full", isAdminMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    await Release.deleteMany({ userId: req.params.id });
    res.json({ message: "Utilisateur et ajouts supprimés" });
  } catch (err) {
    res.status(500).json({ message: "Erreur suppression totale", error: err.message });
  }
});

// 🔍 Vérifier si admin
router.get("/check-admin/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ isAdmin: false, error: "Utilisateur introuvable" });
    }

    res.json({ isAdmin: user.isAdmin });
  } catch (err) {
    res.status(500).json({ isAdmin: false, error: "Erreur serveur", details: err.message });
  }
});

module.exports = router;
