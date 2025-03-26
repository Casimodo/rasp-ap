**Pour télécharger cliquer sur l'une des étiquettes ci-dessous**

[![GitHub release](https://img.shields.io/github/v/release/Casimodo/rasp-ap.svg)](https://github.com/Casimodo/rasp-ap/releases)
[![Github All Releases](https://img.shields.io/github/downloads/Casimodo/rasp-ap/total.svg)](https://github.com/Casimodo/rasp-ap/releases)

# 🧩 Objectif
Créer un système Node.js sur Raspberry Pi qui :

1. ✅ Tente de se connecter automatiquement au Wi-Fi enregistré.

2. ❌ Si échec, passe en mode Point d'Accès (AP) nommé raspi-setup.

3. 🌐 Lance une interface web sur http://192.168.4.1 pour :
    - Afficher la liste des réseaux Wi-Fi détectés

    - Choisir un SSID

    - Entrer le mot de passe Wi-Fi (masqué/démasqué)

4. 🔁 Sauvegarde les identifiants en config.json puis redémarre.

5. 🟢 Si la connexion Wi-Fi est réussie, affiche une page simple "Hello World" avec le SSID connecté.

6. ⚙️ Démarre automatiquement grâce à un service systemd.


# 📂 Structure du projet "rasp-ap"
```php
rasp-ap/
├── index.js                  # Script principal
├── wifi.js                   # Connexion Wi-Fi & scan
├── ap.js                     # Serveur AP & Web
├── config.json               # Fichier de config Wi-Fi
├── scripts/
│   ├── start_ap.sh           # Active le mode AP
│   └── stop_ap.sh            # Réactive le mode Wi-Fi client
├── web/
│   └── index.ejs             # Interface HTML avec liste des SSID
├── public/
│   ├── script.js             # Masquer / afficher le mot de passe
│   └── style.css             # (optionnel)
├── package.json
└── rasp-ap.service           # Fichier systemd à copier

```

# Installation système

## ⚙️ Pré-requis

```bash
sudo apt install -y network-manager hostapd dnsmasq
sudo systemctl stop hostapd
sudo systemctl stop dnsmasq
```

## 🔧 Fichiers de config nécessaires
==/etc/hostapd/hostapd.conf==

```ini
interface=wlan0
driver=nl80211
ssid=raspi-setup
hw_mode=g
channel=6
wpa=2
wpa_passphrase=motdepasseap
wpa_key_mgmt=WPA-PSK
rsn_pairwise=CCMP
```

==/etc/default/hostapd==

```ini
DAEMON_CONF="/etc/hostapd/hostapd.conf"
```

==/etc/dnsmasq.conf==

```ini
interface=wlan0
dhcp-range=192.168.4.10,192.168.4.100,255.255.255.0,24h
```

# 🔄 Script Bash de démarrage en AP
## 📄 scripts/start_ap.sh
- Configure IP statique
- Démarre hostapd + dnsmasq

```bash
#!/bin/bash

echo "[🔁] Activation du mode Point d'Accès..."

# Désactiver les services réseau gérés automatiquement
sudo systemctl stop NetworkManager
sudo systemctl stop wpa_supplicant

# Définir une IP statique sur wlan0
sudo ip link set wlan0 down
sudo ip addr flush dev wlan0
sudo ip addr add 192.168.4.1/24 dev wlan0
sudo ip link set wlan0 up

# Démarrer dnsmasq (DHCP + DNS)
sudo systemctl restart dnsmasq

# Démarrer hostapd (point d'accès)
sudo systemctl unmask hostapd
sudo systemctl enable hostapd
sudo systemctl restart hostapd

echo "[✅] Mode AP actif : SSID = raspi-setup | IP = 192.168.4.1"
```
**Ne pas oublier de faire ceci sur le fichier pour le rendre executable**
```bash
chmod +x scripts/start_ap.sh
```

## 📄 scripts/stop_ap.sh
- Stoppe le mode AP
- Relance les services normaux (NetworkManager, etc.)

```bash
#!/bin/bash

echo "[🔁] Retour au mode client Wi-Fi..."

# Arrêter AP
sudo systemctl stop hostapd
sudo systemctl stop dnsmasq

# Réactiver services normaux
sudo systemctl start NetworkManager
sudo systemctl start wpa_supplicant

echo "[✅] Mode client réactivé"
```

# 🖥️ Interface Web (mode AP)

## 📁 ap.js — Gestion du mode AP et du serveur web
```js
const express = require('express');
const bodyParser = require('body-parser');
const wifi = require('./wifi');
const fs = require('fs');
const path = require('path');

function startAccessPoint() {
  return new Promise((resolve) => {
    const app = express();

    app.set('view engine', 'ejs');
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, 'public')));

    app.get('/', async (req, res) => {
      try {
        const networks = await wifi.scanNetworks();
        res.render(path.join(__dirname, 'web/index.ejs'), { networks });
      } catch (err) {
        res.status(500).send("Erreur lors du scan Wi-Fi");
      }
    });

    app.post('/connect', (req, res) => {
      const { ssid, password } = req.body;
      if (!ssid || !password) {
        return res.status(400).send("Champs requis manquants.");
      }

      const config = {
        ssid,
        password
      };

      fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
      res.send("<h2>✅ Enregistré. Redémarrage dans 3 secondes...</h2><script>setTimeout(()=>{location.reload()}, 3000);</script>");

      setTimeout(() => process.exit(0), 3000);
    });

    app.listen(80, () => {
      console.log("🌐 Serveur AP lancé sur http://192.168.4.1");
      resolve();
    });
  });
}

function startHelloServer() {
  const app = express();

  app.get('/', (req, res) => {
    const { exec } = require('child_process');
    exec('nmcli -t -f ACTIVE,SSID dev wifi', (err, stdout) => {
      if (err) return res.send("Erreur réseau");
      const ssidLine = stdout.split('\n').find(l => l.startsWith('yes:'));
      const ssid = ssidLine ? ssidLine.split(':')[1] : 'Inconnu';
      res.send(`<h1>✅ Connecté à ${ssid}</h1><p>Hello World !</p>`);
    });
  });

  app.listen(80, () => {
    console.log("🌐 Serveur Wi-Fi client lancé sur le port 80");
  });
}

module.exports = { startAccessPoint, startHelloServer };
```

## 📁 wifi.js — Scan des réseaux et connexion

```js
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
```

## 📁 web/index.ejs — Page Web de configuration

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Connexion Wi-Fi</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 2rem auto;
      padding: 1rem;
      background: #f4f4f4;
      border-radius: 10px;
    }
    h1 { text-align: center; }
    form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    input, select, button {
      padding: 10px;
      font-size: 1rem;
    }
    .password-container {
      display: flex;
    }
    .password-container input {
      flex: 1;
    }
  </style>
</head>
<body>
  <h1>🔧 Configurer le Wi-Fi</h1>
  <form method="POST" action="/connect">
    <label>Réseaux détectés :</label>
    <select name="ssid" required>
      <% networks.forEach(net => { %>
        <option value="<%= net.ssid %>">
          <%= net.ssid %> (Signal : <%= net.signal %>%)
        </option>
      <% }) %>
    </select>

    <label>Mot de passe :</label>
    <div class="password-container">
      <input type="password" id="password" name="password" placeholder="Mot de passe" required>
      <button type="button" onclick="togglePassword()">👁️</button>
    </div>

    <button type="submit">Se connecter</button>
  </form>

  <script src="/script.js"></script>
</body>
</html>
```

## 📁 public/script.js — Bouton 👁️ pour mot de passe

```js
function togglePassword() {
  const pwd = document.getElementById("password");
  pwd.type = pwd.type === "password" ? "text" : "password";
}
```

# 🔄 let's go !
Tu peux maintenant :

- Lancer avec sudo node index.js

- Tester en débranchant le Wi-Fi pour forcer le mode AP

- Naviguer sur http://192.168.4.1 en mode AP

- Ajouter un config.json pour simuler une config automatique


# ✅ Fonctionnement au redémarrage

- Si le fichier config.json est présent → tentative de connexion au Wi-Fi.

- Si connexion échoue → active AP raspi-setup, IP : 192.168.4.1.

- Sur AP : interface web dispo pour (re)configurer.

- Si mot de passe saisi → sauvegarde → redémarrage automatique du script.