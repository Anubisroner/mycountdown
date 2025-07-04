const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Autoriser uniquement Netlify
app.use(cors({
  origin: "https://mycountdown1.netlify.app"
}));

app.use(express.json());
app.use(express.static("public"));

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  dbName: "mycountdown"
})
  .then(() => console.log("✅ Connecté à MongoDB : mycountdown"))
  .catch((err) => console.error("❌ Erreur MongoDB :", err));

// Routes API
const userRoutes = require("./routes/user.routes");
app.use("/api", userRoutes);
const releaseRoutes = require("./routes/release.routes");
app.use("/api/releases", releaseRoutes);
app.use("/api/notifications", require("./routes/notifications.routes"));

// Route GET /api/all
const Release = require("./models/release.model"); // Ajouté ici si ce n’était pas déjà importé

app.get("/api/all", async (req, res) => {
  try {
    const releases = await Release.find().sort({ releaseDate: 1 });

    const formatted = releases.map(r => ({
      nom: r.name,
      type: r.type,
      saison: r.season,
      plateforme: r.platform,
      jaquette: r.cover,
      lien: r.url,
      date: r.releaseDate,
      user_id: r.userId
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Erreur /api/all :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Lancement serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Serveur démarré sur le port", PORT);
});
