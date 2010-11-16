var socket = new WebSocket('ws://' + document.location.host);
var canvas = Raphael(0, 0, window.innerWidth, window.innerHeight);
var step = 15;
var offset = [0, 0];
var speed = {38: [0, step, 0], 37: [step, 0, 0], 40: [0, -step, 0], 39: [-step, 0, 0]};
var bits = [];
var iconSize = [50, 50]; 
var uid = '';     

function moveBits(){
  _(speed).each(function(v, k){
    if(v[2] == 1){ // If active add to bits.
      _(bits).each(function(bit){
        bit.coords.x += v[0]; // x
        bit.coords.y += v[1]; // y
        bit.icon.hide();
        bit.icon.translate(v[0], v[1]);
        bit.icon.show();
      });
      
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
  canvas.path("M16,1.466C7.973,1.466,1.466,7.973,1.466,16c0,8.027,6.507,14.534,14.534,14.534c8.027,0,14.534-6.507,14.534-14.534C30.534,7.973,24.027,1.466,16,1.466z M17.328,24.371h-2.707v-2.596h2.707V24.371zM17.328,19.003v0.858h-2.707v-1.057c0-3.19,3.63-3.696,3.63-5.963c0-1.034-0.924-1.826-2.134-1.826c-1.254,0-2.354,0.924-2.354,0.924l-1.541-1.915c0,0,1.519-1.584,4.137-1.584c2.487,0,4.796,1.54,4.796,4.136C21.156,16.208,17.328,16.627,17.328,19.003z")
}

window.onresize = function() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
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
  
  console.log('Droped file at ('+ bit.coords.x +','+ bit.coords.y +')');
  bits.push(bit);
  
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
  console.log('WS Activity:')
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
    bits.push(msg);
    console.log('Got new bit from server:');
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
      },
      requester: msg.requester
    }));
    console.log('Sent file "' + bit.file.name + '" to ' + msg.requester)
  }
  
  if(msg.length == 2 && msg.file && msg.sender) {
    console.log('Receiving ' + msg.file.name + ' from ' + msg.sender);
    console.log(btoa(msg.file.data));
    var reader = new FileReader();
    reader.onloadend = function(e) {
      console.log('Done reading!')
      window.open(window.createObjectURL(e.target.result), 'blank');
    }
    // Check BlobBuilder
    reader.readAs(msg.file.data);
  }
  
  if(msg.del) {
    _(bits).chain().filter(function(b){return b.uid == msg.uid}).each(function(bit){
      bit.icon.remove();
    });
    bits = _(bits).filter(function(b){return b.uid != msg.uid});
    console.log('Client "' + msg.uid + '" disconnected from server. Removing his bits...');
  }
};