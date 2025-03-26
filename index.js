const { exec } = require('child_process');
const wifi = require('./wifi');
const ap = require('./ap');

(async () => {
  console.log("[🚀] Lancement du gestionnaire Wi-Fi...");
  const connected = await wifi.connectToConfiguredWifi();

  if (!connected) {
    console.log("❌ Échec de connexion Wi-Fi.");
    exec('bash scripts/start_ap.sh', async (err) => {
      if (err) {
        console.error("⚠️ Erreur démarrage AP :", err);
        return;
      }
      await ap.startAccessPoint();
    });
  } else {
    exec('bash scripts/stop_ap.sh');
    ap.startHelloServer();
  }
})();
