var noop = function(e) {
    e.stopPropagation();
    e.preventDefault();
};

var canvas = {
    core: Raphael(0, 0, window.innerWidth, window.innerHeight),
    offset: [0, 0],
    speed: {
        38: [0, 15, 0],
        37: [15, 0, 0],
        40: [0, -15, 0],
        39: [ -15, 0, 0]
    },
    icon_size: [50, 50],
    all: null,
    move: function() {
        _(canvas.speed).each(function(v, k) {
            if (v[2] != 1) return;
            _(bits.all).each(function(bit) {
                bit.coords.x += v[0];
                bit.coords.y += v[1];
            });
            canvas.all.hide();
            canvas.all.translate(v[0], v[1]);
            canvas.all.show();
            canvas.offset[0] += v[0];
            canvas.offset[1] += v[1];
        });   
    },
    drop: function(e) {
        noop.apply(this, arguments);
        if (_(bits.all).any(function(bit) {
            return e.x < bit.coords.x + (canvas.icon_size[0] / 2) &&
                   e.x > bit.coords.x - (canvas.icon_size[0] / 2) &&
                   e.y < bit.coords.y + (canvas.icon_size[1] / 2) &&
                   e.y > bit.coords.y - (canvas.icon_size[1] / 2);
        })) {
            alert('Choose another place! There is pleanty of space...');
            return false;
        }
        
        _(e.dataTransfer.files).each(function(file) {
            var reader = new FileReader();
            reader.onloadend = function(ev) {
                bits.add(file, e).file.data = btoa(ev.target.result);
            };
            reader.readAsBinaryString(file);
        });
        
        socket.send({
            op: 'sync',
            bits: me.bits().map(function(b){
                b.coords.x -= canvas.offset[0];
                b.coords.y -= canvas.offset[1];
                return b;
            })
        });
    }
};


var bits = {
    all: [],
    add: function(file, e) {
        if (!me.id) return null;
        var bit = {
            id: randomUUID(),
            client: me.id,
            file: file,
            coords: {
                x: e.x,
                y: e.y
            },
            icon: (function() {
                var icons = ['aac', 'default', 'im', 'mpv2', 'tif', 'ac3', 'der', 'inf', 'msi', 'tiff', 'ace', 'dic', 'information', 'music', 'tmp', 'ade', 'divx', 'ini', 'nfo', 'ttf', 'adp', 'diz', 'iso', 'one', 'txt', 'ai', 'dll', 'isp', 'pdd', 'uis', 'aiff', 'doc', 'java', 'pdf', 'upload', 'aspx', 'docx', 'jfif', 'php', 'url', 'au', 'dos', 'jpeg', 'png', 'vcr', 'avi', 'download', 'jpg', 'pps', 'video', 'bak', 'dvd', 'js', 'ppt', 'visited', 'bat', 'dwg', 'key', 'pptx', 'vob', 'bin', 'dwt', 'log', 'print', 'wba', 'bit', 'email', 'm4a', 'psd', 'wma', 'blue-ray', 'emf', 'm4p', 'rar', 'wmv', 'bmp', 'exc', 'mmf', 'rb', 'wpl', 'bup', 'external', 'mmm', 'reg', 'wri', 'cab', 'fav', 'mov', 'rtf', 'wtx', 'cat', 'feed', 'movie', 'safari', 'wzv', 'chm', 'fla', 'mp2', 'scp', 'xls', 'cmd', 'font', 'mp2v', 'search', 'xlsx', 'cross', 'gif', 'mp3', 'sql', 'xml', 'css', 'hlp', 'mp4', 'swf', 'xsl', 'csv', 'html', 'mpe', 'sys', 'zap', 'cue', 'ie7', 'mpeg', 'theme', 'zip', 'dat', 'ifo', 'mpg', 'tick'];
                var ico_uri = null;

                if (icons.indexOf(file.name.split('.').pop()) > -1)
                    ico_uri = 'imgs/icons/' + file.name.split('.').pop() + '.png';
                else
                    ico_uri = 'imgs/icons/default.png';
                var ico = canvas.core.image(ico_uri, e.x - (canvas.icon_size[0] / 2), e.y - (canvas.icon_size[1] / 2), canvas.icon_size[0], canvas.icon_size[1]);
                ico.attr('title', file.name);
                ico.attr('cursor', 'pointer');
                ico.node.onclick = function() {
                    socket.send({
                        op: 'bit',
                        to: bit.client,
                        id: bit.id
                    });
                };
                console.log(e)
                canvas.all.push(ico);
                return ico;
            })()
        };
        bits.all.push(bit);
        return bit;
    },
    of: function(client) {
        return _(bits.all).filter(function(b) {
            return b.client == client;
        });
    }
};

var me = {
    id: null,
    bits: function() {
        return _(bits.all).filter(function(bit) {
            return bit.client == me.id;
        });
    },
    name: ""
};

var socket = new io.Socket();

window.onload = function(e) {
    socket.connect();
    canvas.all = canvas.core.set();
    var txt = canvas.core.text((canvas.core.width / 2), 200, "Drop your files here.\nThey will be available instantly on other users browsers.\nIf you run out of space you can use the arrow keys to navigate around for more.");
    txt.attr('font-size', '17em');
    txt.attr('font-family', 'Neucha');
    var self = canvas.core.image('imgs/icons/bit.png', canvas.core.width / 2 - canvas.icon_size[0] / 2, canvas.core.height / 2, canvas.icon_size[0], canvas.icon_size[1]);
    self.attr({
        title: 'This is you!'
    });
    canvas.all.push(txt);
    me.name = prompt("What is your nickname?");
}

window.onresize = function() {
    canvas.core.setSize(window.innerWidth, window.innerHeight);
};

document.onkeydown = function(e) {
    if (canvas.speed[e.keyCode]) canvas.speed[e.keyCode][2] = 1;
    canvas.move();
};

document.onkeyup = function(e) {
    if (canvas.speed[e.keyCode]) canvas.speed[e.keyCode][2] = 0;
};
document.onkeypress = document.ondragenter = document.ondragover = document.ondragexit = noop;
document.ondrop = canvas.drop;

socket.on('message', function(data) {
    console.log(data);

    if (data.op == 'id') {
        if (!me.id)
            me.id = data.id;
        else
            bits.all = _(bits.all).reject(function(b) {
                return bits.of(data.id);
            });   
    }

    // if (data.op == 'sync') {
    //     if (data.from) {
    //         if (_(bits).filter(function(b) { return b.id == id }).length > 0) {
    //             console.log('Syncing bits with ' + data.from);
    //             socket.send({
    //                 op: 'sync',
    //                 to: data.from,
    //                 bits: _(bits).filter(function(b) {
    //                     return b.id == id
    //                 }).map(function(b) {
    //                     b.icon = null
    //                     return b
    //                 })
    //             });
    //         }
    //     }
    //     else {
    //         console.log('Syncing bits from broadcast.')
    //         if (data.bits && data.bits.length > 0)
    //             _(data.bits).each(function(bit) {
    //                 bit.coords.x -= offset[0];
    //                 bit.coords.y -= offset[1];
    //                 bit.icon = getIcon(bit);
    //                 bit.id = data.
    //                 bits.push(bit);
    //             });
    // 
    //     }
    // }


    // if (data.op == 'bit') {
    //     if (data.from) {
    //         var bit = _(bits).filter(function(b) {
    //             return b.id == id && data.bit.file.name == b.file.name
    //         }).pop();
    //         socket.send({
    //             op: 'bit',
    //             to: data.from,
    //             bit: {
    //                 id: id,
    //                 file: {
    //                     data: bit.file.data,
    //                     type: bit.file.type,
    //                     size: bit.file.size
    //                 }
    //             }
    //         });
    //     }
    //     else {
    //         console.log('Receiving ' + data.bit.file.name + ' from ' + data.id);
    //         if ( !! window.FileWriter
    //         /* For now I can't use the File:Writer API*/
    //         ) {
    //             window.requestFileSystem(PERSISTENT, data.file.size,
    //             function(fs) {
    //                 fs.root.getDirectory('~/Downloads', {
    //                     create: true
    //                 },
    //                 function(dwn) {
    //                     dwn.getFile(data.file.name, {
    //                         create: true
    //                     },
    //                     function(writer) {
    //                         writer.onwrite = function(e) {
    //                             console.log('Write completed.');
    //                         };
    // 
    //                         writer.onerror = function(e) {
    //                             console.log('Write failed: ' + e);
    //                         };
    // 
    //                         var bb = new BlobBuilder();
    //                         bb.append(atob(data.file.data));
    //                         writer.write(bb.getBlob(data.file.type));
    //                     },
    //                     function(e) {
    //                         console.log(e.toString())
    //                     });
    //                 },
    //                 function(e) {
    //                     console.log(e.toString())
    //                 });
    //             },
    //             function(e) {
    //                 console.log(e.toString())
    //             });
    //         }
    //         else if ( !! window.createBlobURL || !!window.createObjectURL) {
    //             var bb = new BlobBuilder();
    //             var reader = new FileReader();
    //             var url_creator = window.createBlobURL || window.createObjectURL;
    //             bb.append(atob(data.bit.file.data));
    //             reader.onloadend = function(e) {
    //                 bb = new BlobBuilder();
    //                 bb.append(e.target.result);
    //                 var url = url_creator(bb.getBlob(data.bit.file.type));
    //                 window.open(url);
    //             }
    //             reader.readAsBinaryString(bb.getBlob(data.bit.file.type));
    //         }
    //     }
    // }
});
