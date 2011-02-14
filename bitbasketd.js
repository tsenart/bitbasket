var sys = require('sys'),
    path = require('path'),
    express = require('express'),
    ws = require('socket.io'),
    _ = require('underscore')._,
    PORT = process.env['app_port'] || 80,
    WEBROOT = path.join(path.dirname(__filename), 'public');

var app = express.createServer();
app.configure(function() {
    app.use(express.staticProvider(__dirname + '/public'));
});
app.listen(PORT);
var server = ws.listen(app);

server.on('connection', function(client) {
    var id = client.sessionId;
    console.log('Got new client with sessionId = "' + id + '"');
    client.send({op: 'id', id: id});
    client.broadcast({
        op: 'sync',
        from: id
    });

    client.on('message', function(data) {
        if (data.op && data.op == 'sync') {
            if (data.to) server.clients[data.to].send({
                op: 'sync',
                bits: data.bits
            });
            else client.broadcast({
                op: 'sync',
                bits: data.bits,
                from: id
            });
        }

        // // BEGIN NEW FILE
        //  if (data.op == 'bit') {
        //      server.clients[data.to].send({
        //          op: 'bit',
        //          bit: data.bit,
        //          from: id
        //      });
        //  }
        //  // END NEW FILE
        //         // BEGIN PROXY FILE TRANSFER
    });

    // BEGIN CLIENT DISCONNECT
    client.on('disconnect', function() {
        console.log('Client ' + id + ' disconnected. Deleting his files and broadcasting.');
        server.broadcast({
            op: 'id',
            id: id
        });
    });
    // END CLIENT DISCONNECT
});