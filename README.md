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


# Installation système

## 📦 Pré-requis (Packages à installer)

```bash
sudo apt install -y network-manager hostapd dnsmasq
sudo systemctl stop hostapd
sudo systemctl stop dnsmasq
npm install express ejs body-parser
```

### ⚙️ Détail de la partie NodeJS des dépendances:

- ``express``	Serveur web léger (serve les pages et gère les routes HTTP)
- ``ejs``	Moteur de template pour générer dynamiquement les pages HTML (index.ejs)
- ``body-parser``	Permet de lire les données des formulaires POST (comme le SSID/mot de passe)

## 🔧 Fichiers de config nécessaires
`` /etc/hostapd/hostapd.conf ``

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

``/etc/default/hostapd ``

```ini
DAEMON_CONF="/etc/hostapd/hostapd.conf"
```

``/etc/dnsmasq.conf ``

```ini
interface=wlan0
dhcp-range=192.168.4.10,192.168.4.100,255.255.255.0,24h
```

# 🔄 Script Bash de démarrage en AP (explications)
## 📄 scripts/start_ap.sh
- Configure IP statique
- Démarre hostapd + dnsmasq

**Ne pas oublier de faire ceci sur le fichier pour le rendre executable**
```bash
chmod +x scripts/start_ap.sh
```

## 📄 scripts/stop_ap.sh
- Stoppe le mode AP
- Relance les services normaux (NetworkManager, etc.)

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

# 🖥️ let's go, start !
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