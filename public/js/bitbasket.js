var socket = new WebSocket('ws://' + document.location.host);
var canvas = Raphael(0, 0, window.innerWidth, window.innerHeight);
var step = 15;
var offset = [0, 0];
var speed = {38: [0, step, 0], 37: [step, 0, 0], 40: [0, -step, 0], 39: [-step, 0, 0]};
var bits = [];
var allObjects = canvas.set();
var iconSize = [50, 50]; 
var uid = '';     

function moveBits(){
  _(speed).each(function(v, k){
    if(v[2] == 1){ // If active add to bits.
      _(bits).each(function(bit){
        bit.coords.x += v[0]; // x
        bit.coords.y += v[1]; // y
      });
      allObjects.hide();
      allObjects.translate(v[0], v[1]);
      allObjects.show();
      offset[0] += v[0]; 
      offset[1] += v[1];
    }
    
  });
}

function cursorOnBit(e){
  return _(bits).any(function(bit) {
    return e.x < bit.coords.x + (iconSize[0] / 2)  &&
           e.x > bit.coords.x - (iconSize[0] / 2)  &&
           e.y < bit.coords.y + (iconSize[1] / 2)  &&
           e.y > bit.coords.y - (iconSize[1] / 2);
  });
}
 
function noop(e) {
  e.stopPropagation();
  e.preventDefault();
}

function getIcon(bit) {
  var icons = ['aac', 'default', 'im', 'mpv2', 'tif', 'ac3', 'der', 'inf', 'msi', 'tiff', 'ace', 'dic', 'information', 'music', 'tmp', 'ade', 'divx', 'ini', 'nfo', 'ttf', 'adp', 'diz', 'iso', 'one', 'txt', 'ai', 'dll', 'isp', 'pdd', 'uis', 'aiff', 'doc', 'java', 'pdf', 'upload', 'aspx', 'docx', 'jfif', 'php', 'url', 'au', 'dos', 'jpeg', 'png', 'vcr', 'avi', 'download', 'jpg', 'pps', 'video', 'bak', 'dvd', 'js', 'ppt', 'visited', 'bat', 'dwg', 'key', 'pptx', 'vob', 'bin', 'dwt', 'log', 'print', 'wba', 'bit', 'email', 'm4a', 'psd', 'wma', 'blue-ray', 'emf', 'm4p', 'rar', 'wmv', 'bmp', 'exc', 'mmf', 'rb', 'wpl', 'bup', 'external', 'mmm', 'reg', 'wri', 'cab', 'fav', 'mov', 'rtf', 'wtx', 'cat', 'feed', 'movie', 'safari', 'wzv', 'chm', 'fla', 'mp2', 'scp', 'xls', 'cmd', 'font', 'mp2v', 'search', 'xlsx', 'cross', 'gif', 'mp3', 'sql', 'xml', 'css', 'hlp', 'mp4', 'swf', 'xsl', 'csv', 'html', 'mpe', 'sys', 'zap', 'cue', 'ie7', 'mpeg', 'theme', 'zip', 'dat', 'ifo', 'mpg', 'tick'];
  var iconUri = null;
  
  if(icons.indexOf(bit.file.name.split('.').pop()) > -1)
    iconUri = 'imgs/icons/' + bit.file.name.split('.').pop() + '.png';
  else
    iconUri = 'imgs/icons/default.png';
    
  icon = canvas.image(iconUri,
                      bit.coords.x - (iconSize[0] / 2),
                      bit.coords.y - (iconSize[1] / 2),
                      iconSize[0],
                      iconSize[1])
  icon.attr('cursor', 'pointer');
  return icon;
}

window.onload = function(e) {
  // var info = canvas.image('imgs/info.png', 0, 0, 35, 35);
  //  var question = canvas.image('imgs/question.png', 40, 2.5, 30, 30);
  //  info.attr('cursor', 'pointer'); question.attr('cursor', 'pointer');
  //  info.attr('title', 'Drop your files here. Anyone connected should see them real time and vice-versa. Use the arrow keys to walk around space.');
  var txt = canvas.text((canvas.width / 2), 200, "Drop your files here.\nThey will be available instantly on other users browsers.\nIf you run out of space you can use the arrow keys to navigate around for more.");
  txt.attr('font-size', '17em');
  txt.attr('font-family', 'Neucha');
  var me = canvas.circle(canvas.width / 2, canvas.height / 2, iconSize[0] / 2, iconSize[1] / 2);
  me.attr({fill: '#0e0e0e'});
  me.attr({title: 'This is you!'});
  allObjects.push(txt, me);
}

window.onresize = function() {
  canvas.setSize(window.innerWidth, window.innerHeight);
};

window.onbeforeunload = function(e) {
  socket.send(JSON.stringify({uid:uid, del:true}));
}

document.onkeydown = function(e) {
  if(speed[e.keyCode]) speed[e.keyCode][2] = 1;
  moveBits();
};
document.onkeyup = function(e){ if(speed[e.keyCode]) speed[e.keyCode][2] = 0; };
document.onkeypress = document.ondragenter = document.ondragover = document.ondragexit = noop;
document.ondrop = function(e) {
  noop.apply(this, arguments);
  if(cursorOnBit(e)) {
    alert('Choose another place! There is pleanty of space...');
    return false;
  }
  var dropedfile = e.dataTransfer.files[0];
  var reader = new FileReader();      
  var bit = {
    uid: uid,
    file: {
      name: dropedfile.name,
      size: dropedfile.size,
      type: dropedfile.type,
    },
    coords: {x: e.x, y: e.y}
  };
  bit.icon = getIcon(bit);
  bit.icon.node.onclick = function(e) {
    socket.send(JSON.stringify({
      uid: bit.uid,
      file: {
        name: bit.file.name
      },
      requester: uid
    }));
  }
  bits.push(bit);
  allObjects.push(canvas.create)
  allObjects.push(bit.icon);
  
  // Coords with offset
  socket.send(JSON.stringify({
    uid: uid,
    file: {
      name: dropedfile.name,
      size: dropedfile.size,
      type: dropedfile.type
    },
    coords: {x: bit.coords.x - offset[0], y: bit.coords.y - offset[1]}
  }));  
  reader.onloadend = function(e) { 
    bit.file.data = btoa(e.target.result);
  };
  reader.readAsBinaryString(dropedfile);
};

// NETWORKING
socket.onmessage = function(data) {
  var msg = JSON.parse(data.data);
  msg.length = _(msg).keys().length;
  if(msg.length == 1 && msg.uid) {
    uid = msg.uid;
    console.log('You are a new client with id: ' + uid);
  }
  
  if(msg.length == 3 && msg.coords && msg.file && msg.uid != uid) {
    msg.coords.x += offset[0];
    msg.coords.y += offset[1];
    msg.icon = getIcon(msg);
    msg.icon.node.onclick = function(e) {
      socket.send(JSON.stringify({
        uid: msg.uid,
        file: {
          name: msg.file.name
        },
        requester: uid
      }));
    }
    allObjects.push(msg.icon);
    bits.push(msg);
    console.log('Got bit from server:');
    console.log('  ' + msg.uid);
    console.log('  ' + msg.file.name);
  }
  
  if(msg.length == 2 && msg.file && msg.requester) {
    var bit = _(bits).filter(function(b){return b.uid == uid && msg.file.name == b.file.name}).pop();
    socket.send(JSON.stringify({
      file: {
        name: bit.file.name,
        data: bit.file.data,
        type: bit.file.type,
        size: bit.file.size
      },
      requester: msg.requester
    }));
    console.log('Sent file "' + bit.file.name + '" to ' + msg.requester)
  }
  
  if(msg.length == 2 && !!msg.file.data && msg.sender) {
    console.log('Receiving ' + msg.file.name + ' from ' + msg.sender);
    if(false /* For now I can't use the File:Writer API*/) {  
      window.requestFileSystem(PERSISTENT, msg.file.size, function(fs){
        fs.root.getDirectory('~/Downloads', {create: true}, function(dwn){
          dwn.getFile(msg.file.name, {create: true}, function(writer){
            writer.onwrite = function(e) {
              console.log('Write completed.');
            };
    
            writer.onerror = function(e) {
              console.log('Write failed: ' + e);
            };
    
            var bb = new BlobBuilder();
            bb.append(atob(msg.file.data));
            writer.write(bb.getBlob(msg.file.type)); 
          }, function(e){console.log(e.toString())});
        }, function(e){console.log(e.toString())});
      }, function(e){console.log(e.toString())});
    }
    else if(!!window.createObjectURL) {
      var bb = new BlobBuilder();
      var reader = new FileReader();
      bb.append(atob(msg.file.data));
      reader.onloadend = function(e) {
        bb = new BlobBuilder();
        bb.append(e.target.result);
        var url = window.createObjectURL(bb.getBlob(msg.file.type));
        window.open(window.createObjectURL(bb.getBlob(msg.file.type)));
      }
      reader.readAsText(bb.getBlob(msg.file.type));
    }
  }
  
  if(msg.del) {
    _(bits).chain().filter(function(b){return b.uid == msg.uid}).each(function(bit){
      bit.icon.remove();
    });
    bits = _(bits).filter(function(b){return b.uid != msg.uid});
    console.log('Client "' + msg.uid + '" disconnected from server. Removing his bits...');
  }
};