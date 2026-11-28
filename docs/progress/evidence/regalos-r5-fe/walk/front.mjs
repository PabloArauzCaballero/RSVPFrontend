// Same-origin front for the browser walk (NOT part of the product): the site's CSP only lets the page call its own origin or https, so the API prefixes
// the guest page calls from the browser (/gifts, /listings, /providers) are forwarded to the gateway stand-in and everything else to the Next server.
import { createServer, request } from 'node:http';
const API = /^\/(gifts|listings|providers|celebrations)(\/|\?|$)/;
createServer((req, res) => {
  const [port] = API.test(req.url) ? [55850] : [3121];
  const up = request({ host: '127.0.0.1', port, path: req.url, method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  up.on('error', () => { res.writeHead(502); res.end(); });
  req.pipe(up);
}).listen(3120, '127.0.0.1');
