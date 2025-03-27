const { exec } = require('child_process');
const wifi = require('./wifi');
const ap = require('./ap');
const path = require('path');

 
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


(async () => {

  // 🔁 Activer temporairement NetworkManager
  const started = await wifi.startNetworks();
    
  // 🔁 Enable temporairement NetworkManager
  const enabled = await wifi.enableNetworks();

  // 🔁 attendre 1 à 2 secondes (que l'interface Network soit bien démarré)
  console.log("✅ Patienter quelques secondes du lancement de l'interface Network...");
  await sleep(5000);

  console.log("[🚀] Démarrage du gestionnaire Wi-Fi...");
  const networks = await wifi.scanNetworks(); // faire le scan pendant que wlan0 est libre

  // Tenter de se connecter au Wi-Fi configuré
  const connected = await wifi.connectToConfiguredWifi();

  if (connected != false) {
    console.log("[✅] Connexion Wi-Fi réussie.");

    // On quitte le mode AP si actif
    exec('bash scripts/stop_ap.sh', (err) => {
      if (err) console.error("⚠️ Erreur lors de l'arrêt de l'AP :", err.message);
    });

    // Démarrer le serveur web connecté
    ap.startHelloServer(ssid);

  } else {
    console.log("[❌] Échec de la connexion Wi-Fi. Passage en mode AP...");

    const networks = await wifi.scanNetworks(); // faire le scan pendant que wlan0 est libre

    // Démarrage du mode AP via script bash
    exec('bash scripts/start_ap.sh', async (err) => {
      if (err) {
        console.error("⚠️ Échec démarrage AP :", err.message);
        return;
      }

      // Démarrage du serveur web en mode AP
      await ap.startAccessPoint(networks);
    });
  }
})();
