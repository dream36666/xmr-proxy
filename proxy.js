const tls = require('tls');
const { WebSocketServer } = require('ws');

const POOL_HOST = 'gulf.moneroocean.stream';
const POOL_PORT = 443;

const PORT = process.env.PORT || 8081;  // Render sets PORT automatically
const wss = new WebSocketServer({ port: PORT });
console.log(`WS proxy listening on port ${PORT}`);

wss.on('connection', (ws) => {
  console.log('Browser connected');
  let tcpReady = false;
  let msgQueue = [];
  let buffer = '';

  const tcp = tls.connect(POOL_PORT, POOL_HOST, { rejectUnauthorized: false }, () => {
    console.log('Connected to pool via TLS ✓');
    tcpReady = true;
    msgQueue.forEach(m => tcp.write(m));
    msgQueue = [];
  });

  tcp.on('data', (d) => {
    buffer += d.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    lines.forEach(line => {
      if (line.trim() && ws.readyState === 1) ws.send(line);
    });
  });

  tcp.on('error', (e) => console.error('TCP error:', e.code, e.message));
  tcp.on('close', () => ws.close());

  ws.on('message', (msg) => {
    const data = msg.toString() + '\n';
    if (tcpReady) tcp.write(data);
    else msgQueue.push(data);
  });

  ws.on('close', () => tcp.destroy());
  ws.on('error', (e) => console.error('WS error:', e.message));
});
