const http = require("http");
const fs = require("fs");
const path = require("path");
const { insertRsvp, listRsvps } = require("./rsvp-db");
const { validateAndNormalize } = require("./rsvp-validate");

const PORT = process.env.PORT || 3000;
const HOST = "127.0.0.1";

const pagesDir = path.join(__dirname, "pages");
const publicDir = path.join(__dirname, "public");
const routes = {
  "/": "home.html",
  "/church": "church.html",
  "/venue": "venue.html",
  // "/photo": "photo.html", // commented out
  "/last": "last.html",
  "/response": "response.html",
  "/response/admin": "admin.html",
  "/admin": "admin.html",
};

const clients = new Set();

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        if (!raw.trim()) {
          resolve({});
          return;
        }
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer((req, res) => {
  const reqUrl = req.url || "/";
  let pathname;
  try {
    pathname = new URL(reqUrl, `http://${HOST}`).pathname;
  } catch {
    pathname = "/";
  }
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }

  if (pathname === "/api/rsvp" && req.method === "POST") {
    readJsonBody(req)
      .then((body) => {
        const v = validateAndNormalize(body);
        if (!v.ok) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ error: v.error }));
          return;
        }
        try {
          insertRsvp(v.row);
        } catch (err) {
          console.error(err);
          res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ error: "Server error" }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: true }));
      })
      .catch(() => {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      });
    return;
  }

  if (pathname === "/api/admin/rsvps" && req.method === "GET") {
    const adminToken = process.env.WEDDING_ADMIN_TOKEN;
    if (!adminToken) {
      res.writeHead(503, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Admin token not configured on server" }));
      return;
    }
    const auth = req.headers.authorization || "";
    const match = /^Bearer\s+(.+)$/i.exec(auth);
    const got = match ? match[1].trim() : "";
    if (got !== adminToken) {
      res.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
    try {
      const rows = listRsvps();
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ rows }));
    } catch (err) {
      console.error(err);
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Server error" }));
    }
    return;
  }

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

  let urlPath = reqUrl.split("?")[0];
  if (urlPath.length > 1 && urlPath.endsWith("/")) {
    urlPath = urlPath.slice(0, -1);
  }

  if (
    urlPath.startsWith("/public/") ||
    urlPath === "/styles.css" ||
    urlPath === "/reload.js" ||
    urlPath.startsWith("/images/") ||
    urlPath.startsWith("/fonts/") ||
    urlPath.startsWith("/videos/") ||
    urlPath.startsWith("/Videos/")
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
            : ext === ".json"
              ? "application/json; charset=utf-8"
            : ext === ".ttf"
              ? "font/ttf"
              : ext === ".webp"
                ? "image/webp"
                : ext === ".png"
                  ? "image/png"
                  : ext === ".jpeg" || ext === ".jpg"
                    ? "image/jpeg"
                    : ext === ".mp4"
                      ? "video/mp4"
                      : ext === ".mov"
                        ? "video/quicktime"
                        : "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType });
      res.end(file);
    } catch (error) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Asset not found");
    }
    return;
  }

  let page = routes[urlPath];
  if (!page) {
    const guestPath = /^\/response\/(\d+)$/.exec(urlPath);
    if (guestPath) {
      const n = Number(guestPath[1], 10);
      if (Number.isInteger(n) && n >= 1 && n <= 99) {
        page = "response.html";
      }
    }
    if (!page) {
      const rootGuest = /^\/(\d+)$/.exec(urlPath);
      if (rootGuest) {
        const n = Number(rootGuest[1], 10);
        if (Number.isInteger(n) && n >= 1 && n <= 99) {
          page = "home.html";
        }
      }
    }
  }
  let htmlPath;

  if (page) {
    htmlPath = path.join(pagesDir, page);
  } else {
    const dirIndex = path.join(__dirname, urlPath.slice(1), "index.html");
    if (urlPath === "/response" && fs.existsSync(dirIndex)) {
      htmlPath = dirIndex;
    } else {
      console.warn("[404] path:", JSON.stringify(urlPath), "| routes:", Object.keys(routes).join(", "));
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
  }
  try {
    const html = fs.readFileSync(htmlPath, "utf8");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  } catch (err) {
    console.error("Error serving page:", err.message);
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>Server Error</h1><p>Could not load page.</p>");
  }
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\nPort ${PORT} is already in use.\n` +
        `  • Stop the other server (Ctrl+C in that terminal), or\n` +
        `  • Free the port:     kill $(lsof -t -i :${PORT})\n` +
        `  • Or use another port:  PORT=3001 npm start\n`
    );
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, HOST, () => {
  const address = server.address();
  console.log(`Server running at http://${HOST}:${address.port}/`);
  if (!process.env.WEDDING_ADMIN_TOKEN) {
    console.warn(
      "[RSVP] Set env WEDDING_ADMIN_TOKEN to use /admin (RSVP database is still saved for POST /api/rsvp)."
    );
  }
});

const watchPaths = [pagesDir, publicDir];
for (const watchPath of watchPaths) {
  try {
    const watcher = fs.watch(watchPath, { recursive: true }, () => {
      for (const client of clients) {
        client.write("data: reload\n\n");
      }
    });
    watcher.on("error", (error) => {
      console.warn(`Reload watcher disabled for ${watchPath}: ${error.message}`);
    });
  } catch (error) {
    console.warn(`Reload watcher failed for ${watchPath}: ${error.message}`);
  }
}
