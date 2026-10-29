// Serve a built dist under /sow/ on a port, run the shots script against it, then exit.
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const [dir, port, tag] = process.argv.slice(2);
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { let f = decodeURIComponent(q.url.split('?')[0]).replace(/^\/sow\/?/, ''); f = path.join(dir, f || 'index.html'); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dir, 'index.html'); r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
srv.listen(+port, () => spawn('node', [path.join(__dirname, 'v040-shots.cjs'), 'http://localhost:' + port + '/sow/', tag], { stdio: 'inherit' }).on('exit', (c) => process.exit(c ?? 0)));
