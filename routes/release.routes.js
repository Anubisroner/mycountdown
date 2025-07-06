const express = require("express");
const router = express.Router();
const Release = require("../models/release.model");

const User = require("../models/user.model");

async function isOwnerOrAdmin(req, res, next) {
  try {
    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ message: "Non autorisé" });

    const release = await Release.findById(req.params.id);
    if (!release) return res.status(404).json({ message: "Contenu introuvable" });

    if (release.userId.toString() === userId) return next();

    const user = await User.findById(userId);
    if (user?.isAdmin) return next();

    return res.status(403).json({ message: "Accès refusé" });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
}


// ➕ Ajouter une sortie (film/série/jeu)
router.post("/add", async (req, res) => {
  try {
    const { name, type, season, platform, cover, url, releaseDate } = req.body;
    const userId = req.headers["x-user-id"];

    if (!userId || !name || !type || !cover || !url) {
      return res.status(400).json({ message: "Champs requis manquants ou non autorisé." });
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
    console.error("Erreur lors de l'ajout :", err);
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

router.get("/all", async (req, res) => {
  try {
    const releases = await Release.find().sort({ releaseDate: 1 });
    res.json(releases);
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la récupération", error: err.message });
  }
});

router.get("/check-name", async (req, res) => {
  const name = req.query.name?.trim();
  if (!name) return res.status(400).json({ exists: false });

  const found = await Release.findOne({ name });
  res.json({ exists: !!found });
});


router.put("/update/:id", isOwnerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = { ...req.body };
    delete updatedData.userId;

    const updated = await Release.findByIdAndUpdate(id, updatedData, { new: true });
    if (!updated) return res.status(404).json({ message: "Contenu introuvable" });

    res.json({ message: "Contenu modifié", release: updated });
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la mise à jour", error: err.message });
  }
});

router.delete("/delete/:id", isOwnerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Release.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Contenu introuvable" });

    res.json({ message: "Contenu supprimé" });
  } catch (err) {
    res.status(500).json({ message: "Erreur suppression", error: err.message });
  }
});



module.exports = router;
