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

sleep 2
nmcli radio wifi on

echo "[✅] Mode AP actif : SSID = raspi-setup | IP = 192.168.4.1"
