import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const file=path.join(process.cwd(),'dist',url.pathname==='/'?'index.html':url.pathname);
 if(!fs.existsSync(file)){res.statusCode=404;return res.end()}
 const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'})[ext]||'application/octet-stream');fs.createReadStream(file).pipe(res);
}).listen(4174);
