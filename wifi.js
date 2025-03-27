const { exec } = require('child_process');
const fs = require('fs');

const CONFIG_FILE = './config.json';

// 🔁 Activer NetworkManager
function startNetworks() {
  return new Promise((resolve, reject) => {
    exec('sudo systemctl start NetworkManager', (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Erreur lors du démarrage de NetworkManager :", error.message);
        return reject(error);
      }
      if (stderr) {
        console.warn("⚠️ STDERR NetworkManager :", stderr);
      }
      console.log("✅ NetworkManager démarré avec succès.");
      resolve();
    });
  });
}

// 🔁 Enable temporairement NetworkManager
function enableNetworks() {
  return new Promise((resolve, reject) => {
    exec('sudo systemctl enable NetworkManager', (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Erreur lors du l'activation de NetworkManager :", error.message);
        return reject(error);
      }
      if (stderr) {
        console.warn("⚠️ STDERR NetworkManager :", stderr);
      }
      console.log("✅ NetworkManager activé avec succès.");
      resolve();
    });
  });
}

async function scanNetworks() {
  await new Promise(resolve => setTimeout(resolve, 2000)); // attendre 2s
  return new Promise((resolve, reject) => {
    console.log("✅ Scan des SSID en cours...");
    exec('nmcli -t -f SSID,SIGNAL dev wifi', (err, stdout, stderr) => {
      if (err) {
        console.error("❌ Erreur scan Wi-Fi:", err.message);
        return reject(err);
      }
      if (stderr) console.warn("⚠️ stderr:", stderr);

      const lines = stdout.split('\n').filter(Boolean);
      const networks = lines.map(line => {
        const [ssid, signal] = line.split(':');
        return { ssid, signal: parseInt(signal) || 0 };
      });
      resolve(networks.filter(n => n.ssid)); // enlever les vides
    });
  });
}

function connectToConfiguredWifi() {
  if (!fs.existsSync(CONFIG_FILE)) return Promise.resolve(false);

  const { ssid, password } = JSON.parse(fs.readFileSync(CONFIG_FILE));
  return new Promise((resolve) => {
    exec(`nmcli dev wifi connect "${ssid}" password "${password}"`, (err) => {
      if (err) {
        console.log("❌ Connexion échouée à", ssid);
        console.log("❌ Detail err", err);
        return resolve(false);
      }
      console.log("✅ Connecté à", ssid);
      resolve(ssid);
    });
  });
}

module.exports = { startNetworks, enableNetworks, scanNetworks, connectToConfiguredWifi };
