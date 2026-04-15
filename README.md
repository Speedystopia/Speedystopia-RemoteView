# Speedystopia RemoteView

**Diffusion en temps réel de l'écran et du son de votre PC vers n'importe quel appareil du réseau local, avec contrôle tactile à distance.**

![Node.js](https://img.shields.io/badge/Node.js-18+-green) ![Python](https://img.shields.io/badge/Python-3.10+-blue) ![Platform](https://img.shields.io/badge/Platform-Windows-lightgrey) ![License](https://img.shields.io/badge/License-Propriétaire-red)

---

## Fonctionnalités

- **Capture d'écran en temps réel** — FFmpeg (GDI) → MJPEG over HTTP, compatible avec tous les navigateurs (dont Safari iPad)
- **Capture audio système** — WASAPI loopback via Python, streaming PCM brut sur WebSocket, lecture via Web Audio API
- **Contrôle tactile à distance** — Toucher pour déplacer la souris, tap = clic gauche, 2 doigts = clic droit
- **Interface de lancement** — GUI tkinter pour démarrer/arrêter le serveur en un clic
- **Zero configuration** — Détection automatique de FFmpeg, installation automatique des dépendances

## Architecture

```
start.bat / launcher.pyw    ← Point d'entrée (GUI tkinter)
        │
    server.js                ← Serveur Express + routage WebSocket
        │
   ┌────┼────────────┐
   │    │             │
video.js audio.js  input.js  ← Modules Node.js
   │    │             │
FFmpeg  loopback.py  input.py ← Processus enfants
(GDI→   (WASAPI→     (ctypes→
MJPEG)   PCM stdout)  mouse)
```

### Flux vidéo
1. FFmpeg capture l'écran via GDI (2560×1440 → redimensionné 1920×1080)
2. Encode en MJPEG (qualité 3, 20 fps)
3. Un parser JPEG extrait chaque frame (marqueurs SOI/EOI)
4. Diffusion HTTP `multipart/x-mixed-replace` vers tous les clients connectés

### Flux audio
1. `loopback.py` capture la sortie audio système via WASAPI loopback (bibliothèque `soundcard`)
2. Données PCM float32 brutes (44100 Hz, stéréo) écrites sur stdout
3. `audio.js` relaie les chunks binaires vers les clients via WebSocket (`/audio-ws`)
4. Le client lit les données via un `ScriptProcessorNode` (Web Audio API) avec un ring buffer

### Contrôle à distance
1. Les événements tactiles du navigateur sont convertis en coordonnées normalisées (0-1)
2. Envoyés au serveur via WebSocket (`/input-ws`) en JSON
3. `input.js` relaie vers `input.py` (stdin)
4. `input.py` utilise `ctypes` (user32.dll) pour contrôler la souris : `SetCursorPos`, `mouse_event`

### Gestes tactiles

| Geste | Action |
|-------|--------|
| Tap simple (1 doigt) | Clic gauche |
| Tap 2 doigts | Clic droit |
| Appui long (500ms) | Clic droit |
| Glisser (1 doigt) | Déplacer la souris |
| 3 doigts | Afficher les contrôles |

## Prérequis

- **Windows 10/11**
- **Node.js** 18+ — [nodejs.org](https://nodejs.org/)
- **Python** 3.10+ — [python.org](https://python.org/)
- **FFmpeg** — [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) ou `winget install Gyan.FFmpeg`

> FFmpeg est détecté automatiquement dans le PATH, les packages WinGet, et les dossiers courants.

## Installation

```bash
git clone https://github.com/Speedystopia/Speedystopia-RemoteView.git
cd Speedystopia-RemoteView
```

Les dépendances s'installent automatiquement au premier lancement.

## Utilisation

### Avec l'interface graphique (recommandé)

Double-cliquez sur **`start.bat`** — une fenêtre apparaît avec :
- **▶ Lancer** — Démarre la capture et le serveur
- **■ Arrêter** — Coupe tout proprement

### En ligne de commande

```bash
npm install
pip install soundcard numpy
node server.js
```

### Accès depuis un autre appareil

1. Ouvrez un navigateur sur le même réseau local
2. Allez sur `http://<IP_DU_PC>:3000`
3. Cliquez **Lancer en plein écran**

L'adresse réseau est affichée dans les logs au démarrage.

## Structure des fichiers

```
Speedystopia/
├── start.bat          # Lanceur Windows
├── launcher.pyw       # Interface graphique (tkinter)
├── server.js          # Serveur Express + orchestrateur
├── package.json       # Dépendances Node.js
├── loopback.py        # Capture audio WASAPI
├── input.py           # Contrôle souris (ctypes)
├── src/
│   ├── ffmpeg.js      # Détection FFmpeg + constantes
│   ├── video.js       # Capture écran → MJPEG HTTP
│   ├── audio.js       # Audio PCM → WebSocket
│   └── input.js       # Input WebSocket → Python
└── public/
    └── index.html     # Interface web (vidéo + audio + tactile)
```

## Configuration

| Variable | Fichier | Défaut | Description |
|----------|---------|--------|-------------|
| PORT | server.js | 3000 | Port du serveur HTTP |
| Résolution | src/video.js | 1920×1080 | Résolution du flux MJPEG |
| FPS | src/video.js | 20 | Images par seconde |
| Qualité JPEG | src/video.js | 3 | Qualité FFmpeg (2=meilleur, 31=pire) |
| Sample rate | loopback.py | 44100 | Fréquence d'échantillonnage audio |
| Block size | loopback.py | 882 | Taille des blocs audio (20ms) |

## Pare-feu

Si le flux n'est pas accessible depuis un autre appareil, autorisez le port 3000 :

```powershell
netsh advfirewall firewall add rule name="Speedystopia" dir=in action=allow protocol=tcp localport=3000
```

## License

Ce logiciel est sous licence propriétaire. Toute redistribution ou utilisation nécessite une autorisation écrite de l'auteur. Pour obtenir une licence, ouvrez une issue sur ce dépôt.

Voir [LICENSE](LICENSE) pour les détails complets.
