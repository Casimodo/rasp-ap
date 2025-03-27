const express = require('express');
const bodyParser = require('body-parser');
const wifi = require('./wifi');
const fs = require('fs');
const path = require('path');

function startAccessPoint(networks) {
  return new Promise((resolve) => {
    const app = express();

    app.set('view engine', 'ejs');
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, 'public')));

    app.get('/generate_204', (req, res) => res.status(200).send('<meta http-equiv="refresh" content="0;url=http://robot">'));
    app.get('/hotspot-detect.html', (req, res) => res.redirect('http://robot'));
    app.get('/ncsi.txt', (req, res) => res.status(200).send('Microsoft NCSI'));
    app.get('/redirect', (req, res) => res.redirect('http://robot'));

    app.get('/', (req, res) => {
      res.render(path.join(__dirname, 'web/index.ejs'), {});      
    });
    
    app.get('/config', async (req, res) => {
      
      try {
        
        console.log('✅ SSID '+ JSON.stringify(networks) +' trouvés !');
        res.render(path.join(__dirname, 'web/wifi_setup.ejs'), { networks : networks });

      } catch (err) {
        console.error("❌ Erreur lors du config :", err.message);
        res.status(500).send("Erreur lors du scan Wi-Fi<br/>" + "<br/><br/>err:" + JSON.stringify(err));
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
      console.log("🌐 Serveur AP lancé sur http://192.168.4.1 ou http://robot");
      resolve();
    });
  });
}

function startHelloServer(ssid) {
  const app = express();

  app.get('/', (req, res) => {
    const { exec } = require('child_process');
    /*exec('nmcli -t -f ACTIVE,SSID dev wifi', (err, stdout) => {
      if (err) return res.send("Erreur réseau");
      const ssidLine = stdout.split('\n').find(l => l.startsWith('yes:'));
      const ssid = ssidLine ? ssidLine.split(':')[1] : 'Inconnu';*/

      // Récupérer l'adresse IP de wlan0
      exec("hostname -I", (err, ipstdout) => {
        const ip = ipstdout?.trim().split(' ').find(ip => ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.'));
        console.log(`🌐 Serveur lancé sur http://${ip || 'Inconnue'}`);
        res.send(`
          <h1>✅ Connecté au réseau : ${ssid}</h1>
          <p>🧭 Adresse IP locale : <strong>${ip || 'Inconnue'}</strong></p>
          `);
        });
    //});
  });

  app.listen(80, () => {
    
    const { exec } = require('child_process');
    exec("hostname -I", (err, ipstdout) => {
      const ip = ipstdout?.trim().split(' ').find(ip => ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.'));
      console.log(`🌐 Serveur Wi-Fi client lancé sur le port 80 IP:${ip || 'Inconnue'}`);
      });

  });
  
}

module.exports = { startAccessPoint, startHelloServer };
