const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ Connecté à MongoDB"))
  .catch(err => console.error("❌ Erreur MongoDB :", err));

// Modèles
const Notification = require('../models/Notification');
const Release = require('../models/release.model');

// Transporteur IONOS
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT),
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

// Création de log
const logPath = path.join(__dirname, '../logs/mail.log');

function logMail(message) {
  const timestamp = new Date().toISOString();
  const fullMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logPath, fullMessage);
}


async function sendDailyMails() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const releases = await Release.find({ date: today });

    if (releases.length === 0) {
      const message = "📭 Aucune sortie aujourd’hui - cron exécuté";
      console.log(message);
      logMail(message);
      return;
    }

    const templatePath = path.join(__dirname, 'dailyMail.html');
    let htmlTemplate = fs.readFileSync(templatePath, 'utf8');

    const releasesHtml = releases.map(r => `
      <div class="release">
        <p class="release-title">${r.nom}</p>
        <p class="release-info">${r.type}${r.saison ? ` — Saison ${r.saison}` : ''}${r.plateforme ? ` — ${r.plateforme}` : ''} — ${r.date}</p>
      </div>
    `).join('');

    const finalHtml = htmlTemplate.replace('{{RELEASES}}', releasesHtml);

    const subscribed = await Notification.find({});

    for (const user of subscribed) {
      if (user.email) {
        try {
          await transporter.sendMail({
            from: `"MyCountdown" <${process.env.MAIL_USER}>`,
            to: user.email,
            subject: '🎉 Sorties du jour - MyCountdown',
            text: 'Voici les sorties du jour sur MyCountdown.',
            html: finalHtml
          });
          const successMsg = `📨 Mail envoyé à ${user.username} (${user.email})`;
          console.log(successMsg);
          logMail(successMsg);
        } catch (err) {
          const errorMsg = `❌ Échec pour ${user.username} (${user.email}) : ${err.message}`;
          console.error(errorMsg);
          logMail(errorMsg);
        }
      }
    }

  } catch (error) {
    console.error("❌ Erreur globale :", error);
  }
}

module.exports = sendDailyMails;
