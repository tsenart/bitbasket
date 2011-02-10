var sys = require('sys'),
    path = require('path'),
    express = require('express'),
    ws = require('socket.io'),
    _ = require('underscore')._,

    CLIENTS = {},
    PORT = 80,
    WEBROOT = path.join(path.dirname(__filename), 'public');
var app = express.createServer();
app.configure(function() {
    app.use(express.staticProvider(__dirname + '/public'));
});
app.listen(PORT);

var server = ws.listen(app);

server.on('connection', function(client) {
    var id = client.sessionId;
    CLIENTS[id] = client;
    client.send({ op: 'id', id: id });
    console.log('Got new client called "' + id + '"');
    // Request active bits.
    client.broadcast({ op: 'sync', from: id });
    
    client.on('message', function(data) {
        var msg = data;
        
        if (msg.op == 'sync') {
          if(msg.to) CLIENTS[msg.to].send({op: 'sync', bits: msg.bits});
          else client.broadcast({op: 'sync', bits: msg.bits});
        }
        
        // BEGIN NEW FILE
        if (msg.op == 'bit') {
            if(msg.to) CLIENTS[msg.to].send({op: 'bit', bit: msg.bit});
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
    // client.on('disconnect', function() {
    //     console.log('Client ' + id + ' disconnected. Deleting his files and broadcasting.');
    //     delete CLIENTS[id];
    //     server.broadcast(JSON.stringify({
    //         uid: id,
    //         del: true
    //     }));
    // });
    // END CLIENT DISCONNECT
    
});