#!/bin/bash

echo "[🔁] Retour au mode client Wi-Fi..."

# Arrêter AP
sudo systemctl stop hostapd
sudo systemctl stop dnsmasq

# Réactiver services normaux
sudo systemctl start NetworkManager
sudo systemctl start wpa_supplicant

echo "[✅] Mode client réactivé"
