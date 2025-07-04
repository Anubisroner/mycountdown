const express = require('express');
const router = express.Router();
const path = require('path');

// Accès au fichier dans public/mailTest/
const sendDailyMails = require('../public/sendDailyMails.js');

router.post('https://mycountdown.fly.dev/api/test-mail', async (req, res) => {
  try {
    await sendDailyMails();
    res.sendStatus(200);
  } catch (err) {
    console.error('Erreur envoi mail test:', err);
    res.sendStatus(500);
  }
});

module.exports = router;
