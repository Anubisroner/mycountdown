const cron = require('node-cron');
const sendDailyMails = require('./sendDailyMails');

// Planifier l'envoi chaque jour à 8h00
cron.schedule('0 8 * * *', () => {
  console.log("⏰ Lancement automatique de l'envoi des mails...");
  sendDailyMails();
}, {
  timezone: "Europe/Paris" // adapter si besoin
});
