const http = require("http");
const fs = require("fs");
const path = require("path");

const port = process.env.PORT || 10000;
const root = __dirname;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  } catch {
    res.writeHead(400);
    return res.end("Bad Request");
  }

  if (pathname === "/") pathname = "/index.html";

  // Basic protection against path traversal
  const filePath = path.resolve(root, "." + pathname);
  if (!filePath.startsWith(path.resolve(root))) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // SPA/static fallback
      const fallback = path.join(root, "index.html");
      return fs.readFile(fallback, (e, data) => {
        if (e) {
          res.writeHead(404);
          return res.end("Not Found");
        }
        res.writeHead(200, {"Content-Type": mime[".html"]});
        res.end(data);
      });
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mime[ext] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Last Station running on port ${port}`);
});
