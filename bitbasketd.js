var
  sys  = require('sys'),
  path = require('path'),
  url  = require('url'),
  express = require('express'),
  fs   = require('fs'),
  mime = require('mime'),
  ws   = require('websocket-server'),
  qs   = require('querystring'),
  uuid = require('uuid'),
  redis = require('redis'),
  atob = require('base64').decode,
  _    = require('underscore')._,
      
  PORT = 3000,
  WEBROOT = path.join(path.dirname(__filename), 'public'),
  DB = redis.createClient();

var app = express.createServer();

app.configure(function(){
  app.use(express.staticProvider(__dirname + '/public'));
  app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));
});

app.get('/:uid/:filename', function(req, res){
  var uid = req.params.uid;
  var filename = req.params.filename;
  res.send('There will be content for you soon.');  
});

var server = ws.createServer({
  server: app
});

server.on('connection', function(client) {
  var id = uuid.generate();
  client.send(JSON.stringify({uid: id}));
  console.log('WS Activity:');
  console.log('Got new client from "' + client._req.connection.remoteAddress + '" called "' + id + '"');
  DB.keys('clients:*:files', function(err, data) {
    if(err || !data) return;
    _(data.toString('utf8').split(',')).forEach(function(key){
      DB.smembers(key, function(err, data) {
        if(err || !data) return;
        console.log('Broadcasting ' + key + ' ...');
        _(data).map(function(f){return JSON.parse(f.toString('utf8'))}).forEach(function(bit){
          console.log(bit.file.name);
          client.send(JSON.stringify({
            uid: key.split(':')[1],
            file: {
              name: bit.file.name,
              size: bit.file.size,
              type: bit.file.type,
            },
            coords: bit.coords
          }));
        })
      });
    })
  });
  
  client.on('message', function(data){
    console.log('WS Activity:')
    var msg = JSON.parse(data);
    
    if(msg.uid && msg.uid == id && msg.file && msg.coords ) {
      console.log('Got new bit from "' + msg.uid + '" called "' + msg.file.name + '"');
      // Store file in Redis
      DB.sadd('clients:' + msg.uid + ':files', JSON.stringify({file: msg.file, coords: msg.coords}));
      console.log('Broadcasting...');
      client.broadcast(JSON.stringify({
        uid: msg.uid,
        file: {
          name: msg.file.name,
          size: msg.file.size,
          type: msg.file.type,
        },
        coords: msg.coords
      }));
    }
    
    if(msg.uid && msg.del) {
      console.log('Client ' + msg.uid + ' disconnected. Deleting his files and broadcasting.');
      DB.del('clients:' + id + ':files');
      client.broadcast(JSON.stringify({
        uid: id,
        del: true
      }));
    }
  });
  
  server.on('close', function(){
    console.log('Client ' + id + ' disconnected. Deleting his files and broadcasting.');
    DB.del('clients:' + id + ':files');
    server.broadcast(JSON.stringify({
      uid: id,
      del: true
    }));
  });
});

server.on('shutdown', function(err){
  DB.flushdb();
});

server.listen(PORT);