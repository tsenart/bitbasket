var
  sys = require('sys'),
  path = require('path'),
  url = require('url'),
  http = require('http'),
  fs = require('fs'),
  mime = require('mime'),
  ws = require('websocket-server'),
  decode = require('base64').decode,
  qs = require('querystring')
    
  clients = {},
  PORT = 80,
  WEBROOT = path.join(path.dirname(__filename), 'public');
  

function randomstring(L){
  var s= '';
  var randomchar = function() {
    var n= Math.floor(Math.random()*62);
    if(n<10) return n; //1-10
    if(n<36) return String.fromCharCode(n+55); //A-Z
    return String.fromCharCode(n+61); //a-z
  }
  while(s.length< L) s += randomchar();
  return s;
}

var httpServer = http.createServer(function(req, res) {
  var uri = url.parse(req.url).pathname;  
  var filename = path.join(process.cwd(), 'public', qs.unescape(uri));
  path.exists(filename, function(exists) {  
    if(!exists) {  
      res.writeHead(404, {"Content-Type": "text/plain"});  
      res.end("404 Not Found\n");  
      return;  
    }  

    fs.readFile(filename, "binary", function(err, file) {  
      if(err) {  
        res.writeHead(500, {"Content-Type": "text/plain"});  
        res.end(err + "\n"); 
        return;  
      }  

      res.writeHead(200, {"Content-Type": mime.lookup(filename)});  
      res.write(file, "binary");  
      res.end();  
    });  
  });
});

var server = ws.createServer({
  server: httpServer
});

server.addListener("listening", function(){
  var pathname = path.join(process.cwd(), 'public/files');
  path.exists(pathname, function(exists) { 
    if(!exists)
      fs.mkdir(pathname, 0777)
  });
})

server.addListener("connection", function(conn) {
  var bit = randomstring(12)
  var pathname = path.join(process.cwd(), 'public/files', bit);
  fs.mkdir(pathname, 0777)
  for(var k in clients) {
    fs.readdir(path.join(process.cwd(), 'public/files', clients[k].bit), function(err, files) {
      if(!err && files.length > 0) {
        for(var i = 0; i < files.length; ++i) {
          conn.write(JSON.stringify({success:true, bit: clients[k].bit, name: files[i], coords: clients[k]['files'][files[i]]}))
        }
      }
      else {
        conn.write(JSON.stringify({success:false}))
      }
    })
  }
  clients[conn.id] = {bit: bit, files: {}};
  
  conn.addListener("message", function(data){
    var file = JSON.parse(data)
    var pathname = path.join(process.cwd(), 'public/files', clients[conn.id].bit, file.name);
    path.exists(pathname, function(exists) {
      if(!exists) {
        // sys.puts(file.data)
        // sys.puts("\n")
        // sys.puts(decode(file.data))
        fs.writeFile(pathname, decode(file.data), function (err) {
          if (err) {
            conn.write(JSON.stringify({success:false}))
          } else {
            console.log(file.cords)
            if(!clients[conn.id]['files'][file.name])
              clients[conn.id]['files'][file.name]= file.coords;
            console.log('Saved "' + file.name + '" from ' + conn.id + ':' + clients[conn.id].bit);
            server.broadcast(JSON.stringify({success:true, bit: clients[conn.id].bit, name: file.name, coords: file.coords}))
          }
        });
      }
      else {
        conn.write(JSON.stringify({success:false}))
      }
 
    })
  })
  
  conn.addListener("close", function() {
    path.exists(pathname, function(exists) { 
      if(exists) {
        fs.rmdir(pathname, function() {
          server.broadcast(JSON.stringify({success:true, bit: clients[conn.id].bit}))
          delete clients[conn.id];
        });
      }
    });
  });
});

process.on('exit', function () {
  server.emit("shutdown")
})

server.addListener("shutdown", function(){
  var pathname = path.join(process.cwd(), 'public/files');
  path.exists(pathname, function(exists) { 
    if(exists) {
      fs.rmdir(pathname, function() {
        server.broadcast(JSON.stringify({success:true}))
        delete clients;
      });
    }
  });
});

server.listen(PORT);
