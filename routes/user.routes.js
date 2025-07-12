const express = require("express");
const router = express.Router();
const User = require("../models/user.model");
const Release = require("../models/release.model");
const bcrypt = require("bcrypt");
const axios = require("axios");
const jwt = require("jsonwebtoken");

// ✅ Middleware pour vérifier si admin
async function isAdminMiddleware(req, res, next) {
  const token = req.headers.authorization;

  if (!token || !token.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token manquant ou invalide" });
  }

  try {
    const jwtToken = token.split(" ")[1];
    const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId || decoded.id);

    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Accès réservé aux admins" });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(403).json({ message: "Token invalide ou expiré", error: err.message });
  }
}

// 🔐 INSCRIPTION
router.post("/register", async (req, res) => {
  console.log("POST /register", req.body);

  try {
    const { username, password, token } = req.body;

    if (!token) return res.status(400).json({ message: "Captcha requis." });

    const secretKey = process.env.RECAPTCHA_SECRET;

    const response = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      null,
      {
        params: { secret: secretKey, response: token }
      }
    );

    console.log("=== reCAPTCHA Response ===");
    console.log(response.data);

    if (!response.data.success) {
      return res.status(400).json({ message: "Échec du captcha.", details: response.data });
    }

    // ✅ Vérifie pseudo et mot de passe
    if (!username || !password) {
      return res.status(400).json({ message: "Champs requis." });
    }

    const usernameRegex = /^[\wÀ-ÿ\-_.]{3,15}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        message: "Le pseudo doit contenir entre 3 et 15 caractères (lettres, chiffres, tirets, points ou underscores)."
      });
    }

    if (password.length < 8 || password.length > 20) {
      return res.status(400).json({ message: "Le mot de passe doit contenir entre 8 et 20 caractères." });
    }

    // ✅ Vérifie unicité insensible à la casse
    const existing = await User.findOne({ username: { $regex: `^${username}$`, $options: "i" } });
    if (existing) {
      return res.status(409).json({ message: "Nom déjà pris." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashedPassword });

    res.json({ message: "Inscription réussie", userId: user._id });
  } catch (err) {
    console.error("❌ ERREUR REGISTER");
    console.error("Nom complet :", err.name);
    console.error("Message :", err.message);
    console.error("Stack :", err.stack);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// 🔐 CONNEXION
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ message: "Identifiants incorrects" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ message: "Identifiants incorrects" });

  const token = jwt.sign(
    { userId: user._id, isAdmin: user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    message: "Connexion réussie",
    token
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
const verifyToken = require("../middleware/authMiddleware");

router.get("/check-admin/:id", verifyToken, async (req, res) => {
  console.log("🛡️ Vérification admin");
  console.log("🔐 userId du token :", req.user.userId);
  console.log("🧾 userId des params :", req.params.id);
  console.log("👑 isAdmin :", req.user.isAdmin);

  const userIdFromToken = req.user.userId;
  const userIdFromParams = req.params.id;

  if (userIdFromToken !== userIdFromParams && !req.user.isAdmin) {
    console.log("⛔ Accès refusé");
    return res.status(403).json({ isAdmin: false, message: "Accès refusé" });
  }

  res.json({ isAdmin: req.user.isAdmin });
});

router.get("/check-admin", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ isAdmin: false, message: "Token manquant" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId || decoded.id);

    if (!user) return res.status(404).json({ isAdmin: false, message: "Utilisateur introuvable" });

    res.json({ isAdmin: !!user.isAdmin });
  } catch (err) {
    res.status(403).json({ isAdmin: false, message: "Token invalide", error: err.message });
  }
});


module.exports = router;
