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


$(function(){

  typeof FileReader == 'undefined'?
    (function(){
      $('#content').html("<div id='step'>Your browser does not support FileReader. Check the <a href='/browsers'>supported browsers</a></div>")
    })()
    :
    (function(){
      wsConnect('ws://'+location.hostname+':3081');
      handleDragAndDrop($('#dropbox').get(0))
      $('#shortenedUrlDisplay').click(function(){
        $(this).select()
      })
      $("#twitterDMButton").click(function(){
        tweetToken("abc"); //TODO dynamically create this
      });

      warnOnUnload();
    })()
    $("#shareDialog").dialog(
      {  width: 400,
         height: 160,
         modal: true,
         autoOpen: false
      });
})

function handleDragAndDrop(dropbox){
  var steps = ["1. Drag File Into Browser",
               "2. Drop File Here",
               "3. DROP!"]

  document.addEventListener('drop', noop, false);
  document.addEventListener('dragenter', function(e){
    $('#step').text(steps[1]);
    $('#dropbox').addClass('around');
    noop.apply(this, arguments)
  }, false);
  document.addEventListener('dragexit', function(e){
    $('#step').text(steps[0]);
    $('#dropbox').removeClass('above').removeClass('around');
    noop.apply(this, arguments)
  }, false)

  var drop = function(e){
    noop.apply(this, arguments)
    $('#dropbox').removeClass('above').removeClass('around');
    var files = e.dataTransfer.files
    $('body').trigger('uploadfile', [files]);
    
    //$('#step').text("Shared " + files[0].name + " of type " + files[0].type+"!")
    $('#step').text("Shared")
    setTimeout(function(){
      $('#step').fadeOut(1000, function(){
        $('#step')
          .text(steps[0])
          .fadeIn(2000)
      })
    }, 2000)
  }
  

  dropbox.addEventListener("drop", drop, false);
  dropbox.addEventListener("dragexit", noop, false);
  dropbox.addEventListener("dragover", noop, false);
  dropbox.addEventListener("dragenter", function(e){
    $('#step').text(steps[2]);
    $('#dropbox').addClass('above').removeClass('around');
    e.stopPropagation();
    e.preventDefault();
  }, false);
}

function noop(e) {
  e.stopPropagation();
  e.preventDefault();
}

function tweetToken(token){
  var handle = $("#twitterHandle");
  // verify that they entered something
  if ($.trim(handle.val()).length == 0) {
    return
  }
  var url = '/tweet/' + token;
  $.ajax({
    url: url,
    type: 'POST',
    data: {'handle': handle.val()},
    success: function(){
      $("#shareDialog").dialog('close');
      // clear out the username
      handle.val("");
    },
    error: function(request, status, error){
      //$("#shareDialog").dialog('open');
      handle.effect("highlight", {color: 'red'}, 3000);
    }
  });
}

function shortenUrl(token){
  var url = '/shorten/' + token;
  $.get(url, function(data) {
    $("#shortenedUrlDisplay").val(data);
    $("#shareDialog").dialog('open');
  });
}

function warnOnUnload(){
  var uploadedFiles = []
  $('body').bind('uploadfile', function(e, files){
    for(var i = 0; i < files.length; i++){
      // loop append, instead of using concat to ensure that uploadedFiles is the same object
      uploadedFiles.push(files[i]);
    }
  });

  var message = function(){
    if (uploadedFiles.length > 0) {
      var files = (uploadedFiles.length == 1) ? "file" : "files";
      var theseFiles = (uploadedFiles.length == 1) ? "this file" : "these files";
      return "Navigating away from this page will end sharing of " + uploadedFiles.length + " " + files + ".  Any links you shared to " + theseFiles + " will stop working.";
    }
    // empty return does not trigger beforeunload message
  };

  $(window).bind('beforeunload', function(){ 
    return message();
  });
}

function wsConnect(wsurl) {
  var urls = {}
  var fileBuffer = {}
  var socket = new WebSocket(wsurl);
  socket.onopen = function() {
    console.log('Socket open to ' + wsurl );

/*
    var sharemsg = { 'request' : 'share-file',
             'name' : 'my-file.txt',
             'size' : '128',
             'type' : 'application/text'
           };
    socket.send(JSON.stringify(sharemsg));
    */
  };
  socket.onmessage = function(msg) {
    var res = JSON.parse(msg.data);
    if(res.response && res.response == "ok"){
      var url = res.url.replace(/file/g, "preview");
      $('#shortenedUrlDisplay').val(url)
      $("#shareDialog").dialog('open');
      
      $("#fileList").append('<li><a target="_blank" href="'+url+'">'+res.name+'</a> ('+res.sizeDisplay+')</li>');
      $("#instructions").hide();
      $("#fileListBox").show('slow');


    }else if(res.request && res.request == 'get'){
      $('body').trigger('url-recvd', [res])
    }
  }
  
  $('body').bind('url-recvd', function(e, server){
    var file = fileBuffer[server.name];
    typeof FileReader != 'undefined'?
      (function(){
        var reader = new FileReader();
        reader.onloadend = function(e){ 
          $.ajax({
            type: 'PUT',
            url: server.url,
            data: binary.base64Encode(e.target.result),
            dataType: file.type,
            success:function(){
              console.log("data sent")
            }
          });
        }
        reader.readAsBinaryString(file)
      })()
      :
      (function(){
        alert('Your browser doesnt support FileReader.')
      })();
  });
  
  $('body').bind('uploadfile', function(e, files){
    for(var i = 0; i < files.length; i++){
      var request = files[i];
      fileBuffer[request.name] = request
      request.request = 'share-file'
      socket.send(JSON.stringify(request))      
    }
  })
}