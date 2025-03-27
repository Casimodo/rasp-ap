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

    app.get('/generate_204', (req, res) => res.status(200).send('<meta http-equiv="refresh" content="0;url=http://robot">'));
    app.get('/hotspot-detect.html', (req, res) => res.redirect('http://robot'));
    app.get('/ncsi.txt', (req, res) => res.status(200).send('Microsoft NCSI'));
    app.get('/redirect', (req, res) => res.redirect('http://robot'));

    app.get('/', (req, res) => {
      res.render(path.join(__dirname, 'web/index.ejs'), {});      
    });
    

    app.get('/config', async (req, res) => {
      
      try {
        
        // 🔁 Activer temporairement NetworkManager
        await new Promise((resolve, reject) => {
          exec('systemctl start NetworkManager', (error, stdout, stderr) => {
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
        
        // 🔁 Enable temporairement NetworkManager
        await new Promise((resolve, reject) => {
          exec('systemctl enable NetworkManager', (error, stdout, stderr) => {
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

        const networks = await wifi.scanNetworks();
        res.render(path.join(__dirname, 'web/index.ejs'), { networks });
        msgLog = "++";
      } catch (err) {
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
