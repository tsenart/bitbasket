var
  sys  = require('sys'),
  path = require('path'),
  url  = require('url'),
  http = require('http'),
  fs   = require('fs'),
  mime = require('mime'),
  io   = require('socket.io'),
  qs   = require('querystring'),
  uuid = require('uuid'),
  redis = require('redis'),
      
  PORT = 3000,
  WEBROOT = path.join(path.dirname(__filename), 'public'),
  DB = redis.createClient();

var server = http.createServer(function(req, res) {
  var pathname = url.parse(req.url).pathname; 
  if(pathname == '/') pathname = '/index.html';
  var filename = path.join(process.cwd(), 'public', qs.unescape(pathname));
  var statuscode = 200;
  
  path.exists(filename, function(exists) {  
    if(!exists) {
      statuscode = 404;
      filename = '404.html';
    }

    fs.readFile(filename, function(err, file) {  
      if(err) {
        res.writeHead(500, {'Content-Type': 'text/plain'});  
        res.end(err + '\n'); 
        return;
      }
      res.writeHead(statuscode, {'Content-Type': mime.lookup(filename)});  
      res.end(file);
    });  
  });
});

var socket = io.listen(server);

socket.on('connection', function(client) {
  var id = uuid.generate();
  client.send(JSON.stringify({uuid: id}));
  DB.keys('*', function(err, keys) {
    if(err || !keys) return;
    for(var i in keys) {
      var key = keys[i].toString('utf8');
      DB.smembers(key, function(err, data) {
        if(err || !data) return;
        for(var j in data) {
          var bit = JSON.parse(data[j].toString('utf8'));
          client.send(JSON.stringify({
            uuid: key,
            file: {
              name: bit.file.name,
              size: bit.file.size
            },
            coords: bit.coords
          }));
        }        
      });
    }
  });
  
  client.on('message', function(data) {
    var msg = JSON.parse(data);
    if(msg.uuid && msg.file && msg.coords)
      DB.sadd(msg.uuid, JSON.stringify({file: msg.file, coords: msg.coords}));
    client.broadcast(JSON.stringify({
      uuid: msg.uuid,
      file: {
        name: msg.file.name,
        size: msg.file.size,
      },
      coords: msg.coords
    }));
  });
  
  client.on('disconnect', function() {
    DB.del(id);
    client.broadcast(JSON.stringify({
      uuid: id,
      del: true
    }));
  });
});

server.listen(PORT);