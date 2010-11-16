var
  sys  = require('sys'),
  path = require('path'),
  express = require('express'),
  ws   = require('websocket-server'),
  uuid = require('uuid'),
  redis = require('redis'),
  _    = require('underscore')._,
      
  CLIENTS = {},
  PORT = 80,
  WEBROOT = path.join(path.dirname(__filename), 'public'),
  DB = redis.createClient();

var app = express.createServer();

app.configure(function(){
  app.use(express.staticProvider(__dirname + '/public'));
});

app.get('/u/*/*/*', function(req, res){
  var requester = req.params.pop();
  var filename = req.params.pop();
  var uid = req.params.pop();
  console.log(sys.inspect(CLIENTS));
  console.log('Served ' + filename);
  
  
  
});

var server = ws.createServer({
  server: app
});

server.on('connection', function(client) {
  var id = uuid.generate();
  CLIENTS[id] = client;
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
    msg.length = _(msg).keys().length;
    
    if(msg.uid && msg.uid == id && msg.file && msg.coords) {
      console.log('Got new bit from "' + msg.uid + '" called "' + msg.file.name + '"');
      // Store file in Redis
      DB.sadd('clients:' + msg.uid + ':files', JSON.stringify({
        file: {
          name: msg.file.name,
          size: msg.file.size,
        },
        coords: msg.coords
      }));
      DB.set('clients:' + msg.uid + ':files:' + msg.file.name.toString('base64'), JSON.stringify({
        file: {
          data: msg.file.data,
          type: msg.file.type
        }
      }));
      console.log('Broadcasting...');
      client.broadcast(JSON.stringify({
        uid: msg.uid,
        file: {
          name: msg.file.name,
          size: msg.file.size,
        },
        coords: msg.coords
      }));
    }
    
    
    if(msg.length == 2 && msg.file && msg.requester) {
      CLIENTS[msg.requester].send(JSON.stringify({
        file: msg.file,
        sender: id
      }));
      console.log('Proxying file transfer (' + msg.file.name + '). From ' + id + ' to ' + msg.requester);
    }
    
    if(msg.length == 3 && msg.file && msg.requester && msg.uid) {
      console.log('Requesting ' + msg.file.name + ' from ' + msg.uid);
      console.log(CLIENTS[msg.uid]);
      CLIENTS[msg.uid].send(JSON.stringify({
        file: {
          name: msg.file.name
        },
        requester: msg.requester
      }));  
    }
    
    if(msg.uid && msg.del) {
      console.log('Client ' + msg.uid + ' disconnected. Deleting his files and broadcasting.');
      delete CLIENTS[msg.uid];
      DB.del('clients:' + id + ':files');
      DB.keys('clients:' + id + ':files:*', function(err, data){
        if(err || !data) return;
        _(data.toString('utf8').split(',')).forEach(function(key) {
          DB.del(key);
        });
      });
      client.broadcast(JSON.stringify({
        uid: id,
        del: true
      }));
    }
  });
  
  server.on('close', function(){
    console.log('Client ' + id + ' disconnected. Deleting his files and broadcasting.');
    delete CLIENTS[id];
    DB.del('clients:' + id + ':files');
    DB.keys('clients:' + id + ':files:*', function(err, data){
      if(err || !data) return;
      _(data.toString('utf8').split(',')).forEach(function(key) {
        DB.del(key);
      });
    });
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