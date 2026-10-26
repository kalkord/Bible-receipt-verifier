const http = require('node:http');
const net = require('node:net');

const targets = [['CBE', 'apps.cbe.com.et', 100], ['Telebirr', 'transactioninfo.ethiotelecom.et', 443]];
function probe([name, host, port]) {
  return new Promise(resolve => {
    const started = Date.now();
    const socket = net.createConnection({host, port});
    let done = false;
    const finish = (connected, error) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve({name, host, port, connected, error, elapsedMs: Date.now() - started});
    };
    socket.setTimeout(8000);
    socket.once('connect', () => finish(true, null));
    socket.once('timeout', () => finish(false, 'TIMEOUT'));
    socket.once('error', error => finish(false, error.code || 'CONNECTION_FAILED'));
  });
}

// Probe fixed bank destinations once on startup; public requests cannot trigger traffic.
let results = null;
Promise.all(targets.map(probe)).then(value => { results = value; });
http.createServer((req, res) => {
  if (req.url !== '/' && req.url !== '/health') {
    res.writeHead(404); return res.end();
  }
  res.writeHead(200, {'Content-Type': 'application/json', 'Cache-Control': 'no-store'});
  res.end(JSON.stringify({purpose: 'TCP connectivity test only; does not verify payments or confirm HTTP access', status: results ? 'completed' : 'testing', results}, null, 2));
}).listen(Number(process.env.PORT || 3000), '0.0.0.0');
