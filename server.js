const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
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

// Route pour tester l'envoi de mail
// const path = require('path');
// const mailTestRoute = require('./routes/mailTestRoute');
// app.use(mailTestRoute);
// app.use('/mailTest', express.static(path.join(__dirname, 'public', 'mailTest')));

// const sendDailyMails = require('./public/sendDailyMails.js');

// app.post('/api/test-mail', async (req, res) => {
//   try {
//     await sendDailyMails();
//     res.sendStatus(200);
//   } catch (err) {
//     console.error('Erreur envoi mail test:', err);
//     res.sendStatus(500);
//   }
// });


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
