const { exec } = require('child_process');
const fs = require('fs');

const CONFIG_FILE = './config.json';

function scanNetworks() {
  return new Promise((resolve, reject) => {
    exec('nmcli -t -f SSID,SIGNAL dev wifi', (err, stdout) => {
      if (err) return reject(err);
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
        return resolve(false);
      }
      console.log("✅ Connecté à", ssid);
      resolve(true);
    });
  });
}

module.exports = { scanNetworks, connectToConfiguredWifi };
