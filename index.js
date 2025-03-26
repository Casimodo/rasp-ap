const { exec } = require('child_process');
const wifi = require('./wifi');
const ap = require('./ap');
const path = require('path');

(async () => {
  console.log("[🚀] Démarrage du gestionnaire Wi-Fi...");

  // Tenter de se connecter au Wi-Fi configuré
  const connected = await wifi.connectToConfiguredWifi();

  if (connected) {
    console.log("[✅] Connexion Wi-Fi réussie.");

    // On quitte le mode AP si actif
    exec('bash scripts/stop_ap.sh', (err) => {
      if (err) console.error("⚠️ Erreur lors de l'arrêt de l'AP :", err.message);
    });

    // Démarrer le serveur web connecté
    ap.startHelloServer();

  } else {
    console.log("[❌] Échec de la connexion Wi-Fi. Passage en mode AP...");

    // Démarrage du mode AP via script bash
    exec('bash scripts/start_ap.sh', async (err) => {
      if (err) {
        console.error("⚠️ Échec démarrage AP :", err.message);
        return;
      }

      // Démarrage du serveur web en mode AP
      await ap.startAccessPoint();
    });
  }
})();
