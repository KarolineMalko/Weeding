const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

const pagesDir = path.join(__dirname, "pages");
const publicDir = path.join(__dirname, "public");
const routes = {
  "/": "home.html",
  "/church": "church.html",
  "/venue": "venue.html",
  "/last": "last.html",
};

const clients = new Set();

const server = http.createServer((req, res) => {
  if (req.url === "/__reload") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write("\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  let urlPath = (req.url || "/").split("?")[0];
  if (urlPath.length > 1 && urlPath.endsWith("/")) {
    urlPath = urlPath.slice(0, -1);
  }

  if (
    urlPath.startsWith("/public/") ||
    urlPath === "/styles.css" ||
    urlPath === "/reload.js" ||
    urlPath.startsWith("/images/") ||
    urlPath.startsWith("/fonts/")
  ) {
    const safePath = decodeURIComponent(
      urlPath.startsWith("/public/") ? urlPath.replace("/public/", "") : urlPath
    ).replace(/^\/+/, "");
    const filePath = path.join(publicDir, safePath);
    try {
      const file = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const contentType =
        ext === ".css"
          ? "text/css; charset=utf-8"
          : ext === ".js"
            ? "application/javascript; charset=utf-8"
            : ext === ".ttf"
              ? "font/ttf"
              : ext === ".webp"
                ? "image/webp"
                : ext === ".png"
                  ? "image/png"
                  : "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType });
      res.end(file);
    } catch (error) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Asset not found");
    }
    return;
  }

  const page = routes[urlPath];
  if (!page) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }

  const htmlPath = path.join(pagesDir, page);
  const html = fs.readFileSync(htmlPath, "utf8");
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

const projectRoot = __dirname;
fs.watch(projectRoot, { recursive: true }, () => {
  for (const client of clients) {
    client.write("data: reload\n\n");
  }
});
