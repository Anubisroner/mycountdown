const express = require("express");
const router = express.Router();
const Release = require("../models/release.model");
const User = require("../models/user.model");
const verifyToken = require("../middleware/authMiddleware");

// 🔐 Middleware propriétaire OU admin
async function isOwnerOrAdmin(req, res, next) {
  try {
    const release = await Release.findById(req.params.id);
    if (!release) return res.status(404).json({ message: "Contenu introuvable" });

    const userId = req.user.userId;
    if (release.userId.toString() === userId || req.user.isAdmin) {
      return next();
    }

    return res.status(403).json({ message: "Accès refusé" });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
}

// ➕ Ajouter une sortie
router.post("/add", verifyToken, async (req, res) => {
  try {
    const { name, type, season, platform, cover, url, releaseDate } = req.body;
    const userId = req.user.userId;

    if (!name || !type || !cover || !url) {
      return res.status(400).json({ message: "Champs requis manquants." });
    }

    const newRelease = await Release.create({
      name,
      type,
      season: type === "SERIE" ? season : undefined,
      platform: type === "JEU" ? platform : undefined,
      cover,
      url,
      releaseDate,
      userId
    });

    res.json({ message: "Ajout réussi", release: newRelease });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

// 🔁 Modifier
router.put("/update/:id", verifyToken, isOwnerOrAdmin, async (req, res) => {
  try {
    const updatedData = { ...req.body };
    delete updatedData.userId;

    const updated = await Release.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    if (!updated) return res.status(404).json({ message: "Contenu introuvable" });

    res.json({ message: "Contenu modifié", release: updated });
  } catch (err) {
    res.status(500).json({ message: "Erreur mise à jour", error: err.message });
  }
});

// ❌ Supprimer
router.delete("/delete/:id", verifyToken, isOwnerOrAdmin, async (req, res) => {
  try {
    const deleted = await Release.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Contenu introuvable" });

    res.json({ message: "Contenu supprimé" });
  } catch (err) {
    res.status(500).json({ message: "Erreur suppression", error: err.message });
  }
});

// 📦 Récupérer tous les contenus
router.get("/all", async (req, res) => {
  try {
    const releases = await Release.find();
    const formatted = releases.map(r => ({
      ...r.toObject(),
      userId: r.userId.toString()
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// 🔍 Vérif nom déjà existant
router.get("/check-name", async (req, res) => {
  const name = req.query.name?.trim();
  if (!name) return res.status(400).json({ exists: false });

  const found = await Release.findOne({ name });
  res.json({ exists: !!found });
});

module.exports = router;
