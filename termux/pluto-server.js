// Server statico minimo, zero dipendenze npm (solo moduli integrati di
// Node), pensato per girare dentro Termux sul tablet. Serve i file di
// software/pluto-runtime cosi' Chrome, sullo stesso tablet, puo' aprire
// http://127.0.0.1:5173 senza bisogno del PC ne' di una rete.

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 5173;
const ROOT = path.join(__dirname, "pluto-runtime");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".wav": "audio/wav",
  ".json": "application/json; charset=utf-8",
  ".ino": "text/plain; charset=utf-8",
};

const server = http.createServer((req, res) => {
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
