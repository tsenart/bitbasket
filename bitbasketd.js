var sys = require('sys'),
    path = require('path'),
    express = require('express'),
    ws = require('socket.io'),
    uuid = require('uuid'),
    redis = require('redis'),
    _ = require('underscore')._,

    CLIENTS = {},
    PORT = 80,
    WEBROOT = path.join(path.dirname(__filename), 'public'),
    DB = redis.createClient();

var app = express.createServer();

app.configure(function() {
    app.use(express.staticProvider(__dirname + '/public'));
});
app.listen(PORT);

// app.get('/u/*/*/*', function(req, res) {
//     var requester = req.params.pop();
//     var filename = req.params.pop();
//     var uid = req.params.pop();
//     console.log(sys.inspect(CLIENTS));
//     console.log('Served ' + filename);
// });

var server = ws.listen(app);

server.on('connection', function(client) {
    var id = uuid.generate();
    CLIENTS[id] = client;
    client.send(JSON.stringify({
        uid: id
    }));
    console.log('Got new client called "' + id + '"');
    DB.keys('clients:*:files', function(err, data) {
        if (err || !data) return;
        _(data.toString('utf8').split(',')).forEach(function(key) {
            DB.smembers(key, function(err, data) {
                if (err || !data) return;
                console.log('Broadcasting ' + key + ' ...');
                _(data).map(function(f) {
                    return JSON.parse(f.toString('utf8'));
                }).forEach(function(bit) {
                    client.send(JSON.stringify({
                        uid: key.split(':')[1],
                        file: {
                            name: bit.file.name,
                            size: bit.file.size,
                        },
                        coords: bit.coords
                    }));
                });
            });
        });
    });

    client.on('message', function(data) {      
        var msg = JSON.parse(data);
        msg.length = _(msg).keys().length;
        
        // BEGIN NEW FILE
        if (msg.length == 3 && msg.uid == id && msg.file && msg.coords) {
            console.log('Got new bit from "' + msg.uid + '" called "' + msg.file.name + '"');
            DB.sadd('clients:' + msg.uid + ':files', JSON.stringify({
                file: {
                    name: msg.file.name,
                    size: msg.file.size,
                },
                coords: msg.coords
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
        // END NEW FILE

        // BEGIN PROXY FILE TRANSFER
        if (msg.length == 2 && msg.file && msg.requester) {
            CLIENTS[msg.requester].send(JSON.stringify({
                file: msg.file,
                sender: id
            }));
            console.log('Proxying file transfer (' + msg.file.name + '). From ' + id + ' to ' + msg.requester);
        }
        // END PROXY FILE TRANSFER
        
        // BEGIN FILE REQUEST
        if (msg.length == 3 && msg.file && msg.requester && msg.uid) {
            console.log('Requesting ' + msg.file.name + ' from ' + msg.uid);
            CLIENTS[msg.uid].send(JSON.stringify({
                file: {
                    name: msg.file.name
                },
                requester: msg.requester
            }));
        }
        // END FILE REQUEST
        
    });
    
    // BEGIN CLIENT DISCONNECT
    client.on('disconnect', function() {
        console.log('Client ' + id + ' disconnected. Deleting his files and broadcasting.');
        delete CLIENTS[id];
        DB.del('clients:' + id + ':files')
        server.broadcast(JSON.stringify({
            uid: id,
            del: true
        }));
    });
    // END CLIENT DISCONNECT
    
});