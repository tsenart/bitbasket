/*
 * Adapted from jquery.base64
 */
var binary = new Object();

binary.base64Encode = function(input) {
  var keyString = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var output = "";
  var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
  var i = 0;
  while (i < input.length) {
    chr1 = input.charCodeAt(i++);
    chr2 = input.charCodeAt(i++);
    chr3 = input.charCodeAt(i++);
    enc1 = chr1 >> 2;
    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
    enc4 = chr3 & 63;
    if (isNaN(chr2)) {
      enc3 = enc4 = 64;
    } else if (isNaN(chr3)) {
      enc4 = 64;
    }
    output = output + keyString.charAt(enc1) + keyString.charAt(enc2) + keyString.charAt(enc3) + keyString.charAt(enc4);
  }
  return output;
}

function noop(e) {
  e.stopPropagation();
  e.preventDefault();
}

function randomstring(L){
  var s= '';
  var randomchar = function() {
    var n= Math.floor(Math.random()*62);
    if(n<10) return n; //1-10
    if(n<36) return String.fromCharCode(n+55); //A-Z
    return String.fromCharCode(n+61); //a-z
  }
  while(s.length< L) s += randomchar();
  return s;
}

function truncate(str, len) {
  return str.substr(0,len);
}

$(function(){
  if (typeof FileReader == 'undefined' || typeof WebSocket == 'undefined')
    (function() {
      $('#content').html("<h3>Your browser does not support BitBasket.<br>Please use Chrome 6+, Firefox 4 beta or Safari 6beta+</h3>")
    })()
  else {
    (function(){
      wsConnect('ws://' + document.location.hostname);
      handleDragAndDrop($('#basket').get(0))
    })()
  }
})

function handleDragAndDrop(dropbox){
  var steps = ["",
               "Here...",
               "Let it go!"]
               
  document.addEventListener('drop', noop, false);
  document.addEventListener('dragenter', function(e) {
   $('#step').text(steps[1]);
   $('#basket').addClass('around');
   noop.apply(this, arguments)
  }, false);

  document.addEventListener('dragexit', function(e){
   $('#step').text(steps[0]);
   $('#basket').removeClass();
   noop.apply(this, arguments)
  }, false)
  
  var drop = function(e){
    noop.apply(this, arguments)
    $('#basket').removeClass();
    if([e.dataTransfer.files].length != 1) {
      $('#step').text("One file at a time please.");
    }
    else {
      var files = e.dataTransfer.files;
      files[0].coords = {x:e.pageX, y:e.pageY, w:$('#basket').width(), h:$('#basket').height()};
      $('#step').text("Awesome!")
      $('body').trigger('uploadfile', [files]);
    }
    setTimeout(function(){
      $('#step').fadeOut(1000, function(){
        $('#step')
          .text(steps[0])
          .fadeIn(2000)
      })
    }, 2000)
  }
  

  basket.addEventListener("dragexit", function(e){
      $('#step').text(steps[1]);
      $('#basket').removeClass().addClass('around');
      noop.apply(this, arguments);
  }, false);
  basket.addEventListener("drop", drop, false);
  basket.addEventListener("dragover", noop, false);
  basket.addEventListener("dragenter", function(e){
    $('#step').text(steps[2]);
    $('#basket').addClass('above').removeClass('around');
    noop.apply(this, arguments)
  }, false);
}

function wsConnect(wsurl) {
  var socket = new WebSocket(wsurl);
  socket.onopen = function() {
    socket.onmessage = function(res) {
      var data = JSON.parse(res.data)
      var url = 'http://' + document.location.hostname + '/files/';
      if(data.success && data.name) {
        var rand_id = randomstring(5);
        var fullpath = url + data.bit + '/' + data.name
        $("#basket").append('<div id="' + rand_id + '" class="bit ' + data.bit + '"><a target="_blank" href="'+ fullpath + '" title="' + data.name + '"><img src="imgs/bit.png">' + truncate(data.name, 6) + '...</a></li>')
        $('#' + rand_id).css({
            'left' : (($('#basket').width() - data.coords['w'] - 25) / 2 + data.coords['x']) + 'px',
            'top' : data.coords['y'] - 25 + 'px'
        });
      }
      else if(data.success && !data.name) {
        $(".bit a[href*=" + data.bit + "]").remove();
      }
      else if(data.success && !data.bit) {
        $("." + data.bit).remove();
      }
      else
        $('#step').text("Something went wrong...");
    }
  }
  
  $('body').bind('uploadfile', function(e, params){
      var reader = new FileReader();
      reader.onloadend = function(e) {
        socket.send(JSON.stringify({
          name: params[0].name,
          data: binary.base64Encode(e.target.result),
          coords: params[0].coords
        }))
        console.log("Sent file: " + params[0].name)
      }
      reader.readAsBinaryString(params[0])
  })
}