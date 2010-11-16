var
  sys  = require('sys'),
  path = require('path'),
  express = require('express'),
  ws   = require('websocket-server'),
  uuid = require('uuid'),
  redis = require('redis'),
  _    = require('underscore')._,
      
  PORT = 80,
  WEBROOT = path.join(path.dirname(__filename), 'public'),
  DB = redis.createClient();

var app = express.createServer();

app.configure(function(){
  app.use(express.staticProvider(__dirname + '/public'));
});

app.get('/u/:uid/*', function(req, res){
  var uid = req.params.uid;
  var filename = req.params.pop();
  console.log('Served ' + filename);
  DB.smembers('clients:' + uid + ':files', function(err, data) {
    if(err || !data)
      res.send('Not here...', 404);
    else {
      var file = _(data).map(function(f){return JSON.parse(f.toString('utf8'))}).filter(function(f){
        return f.file.name == filename;
      });
      if(file && file.length > 0) {
        res.send(new Buffer(file[0].file.data, 'base64'), { 'Content-Type': file[0].file.type }, 200);
      }
      else
        res.send('Not here...', 404)
    }
  });
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