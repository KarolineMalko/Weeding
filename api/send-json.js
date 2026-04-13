/**
 * Raw Node ServerResponse helpers — Vercel serverless does not provide res.status().json().
 */

function sendJson(res, status, body) {
  if (status === 204) {
    res.writeHead(204);
    res.end();
    return;
  }
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(body));
}

module.exports = { sendJson };
