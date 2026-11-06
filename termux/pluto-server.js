// Server statico minimo, zero dipendenze npm (solo moduli integrati di
// Node), pensato per girare dentro Termux sul tablet. Serve i file di
// software/pluto-runtime cosi' Chrome, sullo stesso tablet, puo' aprire
// http://127.0.0.1:5173 senza bisogno del PC ne' di una rete.
//
// Resta di sola lettura (GET) per tutto il sito, con UNA sola eccezione:
// POST /api/upload-sample/<nome file> — usato dall'editor del musicista
// (editor.html) per caricare un campione audio direttamente da tablet,
// senza doverlo copiare a mano in assets/samples/. Il server e' legato
// a 127.0.0.1 (vedi server.listen sotto): mai raggiungibile dalla rete,
// solo dal tablet stesso — e' per questo che l'endpoint di scrittura e'
// accettabile qui.

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 5173;
const ROOT = path.join(__dirname, "pluto-runtime");
const SAMPLES_DIR = path.join(ROOT, "assets", "samples");
const UPLOAD_PREFIX = "/api/upload-sample/";
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB, abbondante per un campione .wav

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".wav": "audio/wav",
  ".json": "application/json; charset=utf-8",
  ".ino": "text/plain; charset=utf-8",
};

function handleUpload(req, res) {
  const rawName = decodeURIComponent(req.url.slice(UPLOAD_PREFIX.length));
  const safeName = path.basename(rawName).replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!safeName || !/\.(wav|mp3|ogg)$/i.test(safeName)) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Nome file non valido: serve un'estensione .wav, .mp3 o .ogg");
  }

  const chunks = [];
  let total = 0;
  let tooBig = false;

  req.on("data", (chunk) => {
    total += chunk.length;
    if (total > MAX_UPLOAD_BYTES) {
      tooBig = true;
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });

  req.on("end", () => {
    if (tooBig) return; // la risposta non serve: la connessione e' gia' stata chiusa
    fs.mkdir(SAMPLES_DIR, { recursive: true }, (mkdirErr) => {
      if (mkdirErr) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("Errore creando la cartella assets/samples");
      }
      const dest = path.join(SAMPLES_DIR, safeName);
      fs.writeFile(dest, Buffer.concat(chunks), (writeErr) => {
        if (writeErr) {
          res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          return res.end("Errore scrivendo il file");
        }
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true, path: `assets/samples/${safeName}` }));
      });
    });
  });

  req.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Errore ricevendo il file");
    }
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url.startsWith(UPLOAD_PREFIX)) {
    return handleUpload(req, res);
  }

  let reqPath = decodeURIComponent(req.url.split("?")[0]);
  if (reqPath === "/") reqPath = "/index.html";

  const filePath = path.normalize(path.join(ROOT, reqPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end("Vietato");
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("Non trovato");
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Pluto pronto su http://127.0.0.1:${PORT}`);
});
