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
  var steps = ["Drop a file here if you please...",
               "... in this pulsing area.",
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
    $('body').trigger('uploadfile', [e.dataTransfer.files]);
    $('#step').text("Awesome!")
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
      if(data.success && data.name)
        $("#filelist").append('<li><a target="_blank" href="'+ url + data.bit + '/' + data.name + '">' + data.name +'</a></li>');
      else if(data.success && !data.name) {
        $("#filelist li a[href*=" + data.bit + "]").remove();
      }
      else
        $('#step').text("Something went wrong...");
    }
  }
  
  $('body').bind('uploadfile', function(e, files){
      var reader = new FileReader();
      reader.onloadend = function(e) {
        socket.send(JSON.stringify({
          name: files[0].name,
          data: binary.base64Encode(e.target.result)
        }))
        console.log("Sent file: " + files[0].name)
      }
      reader.readAsBinaryString(files[0])
  })
}