// Handle prefixed versions
navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

// State
var me = {};
var myStream;
var peers = {};
var camera = []
var peerIds = []

init();

// Start everything up
function init() {
  if (!navigator.getUserMedia) return unsupported();

  getLocalAudioStream(function(err, stream) {
    if (err || !stream) return;
    
    connectToPeerJS(function(err) {
      if (err) return;
      
      registerIdWithServer(me.id);
      console.log('peer length: ',call.peers.length)
      playStream(stream, me.id)
      if (call.peers.length) callPeers();
      else displayShareMessage();
    });
  });
}

// Connect to PeerJS and get an ID
function connectToPeerJS(cb) {
  display('Connecting to PeerJS...');
  me = new Peer({
        host: "gra6.fesnit.net",
        port: 9000,
        path: '/peerjs',
        debug: 3,
        config: {
            'iceServers': [
                { url: 'stun:stun1.l.google.com:19302' }
            ]
        }
    });

  me.on('call', handleIncomingCall);
  
  me.on('open', function() {
    display('Connected.');
    display('ID: ' + me.id);
    cb && cb(null, me);
  });
  
  me.on('error', function(err) {
    display(err);
    cb && cb(err);
  });
}

// Add our ID to the list of PeerJS IDs for this call
function registerIdWithServer() {
  display('Registering ID with server...');
  // $.post('/' + call.id + '/addpeer/' + me.id);
} 

// Remove our ID from the call's list of IDs
function unregisterIdWithServer() {
  // $.post('/' + call.id + '/removepeer/' + me.id);
}

// Call each of the peer IDs using PeerJS
function callPeers() {
    peerIds.forEach(callPeer);
}

function callPeer(peerId) {
  display('Calling ' + peerId + '...');
  var peer = getPeer(peerId);
  peer.outgoing = me.call(peerId, myStream);
  
  peer.outgoing.on('error', function(err) {
    display(err);
  });

  peer.outgoing.on('stream', function(stream) {
    display('Connected to ' + peerId + '.');
    addIncomingStream(peer, stream);
  });
}

// When someone initiates a call via PeerJS
function handleIncomingCall(incoming) {
  console.log('incoming: ',incoming)
  var acceptsCall 
  
  //concat remote ids
  if(incoming.metadata!==undefined){
    console.log('---------------')
    acceptsCall = confirm("Videocall incoming, do you want to accept it ?");
    peerIds = peerIds.concat(incoming.metadata.peerIds)
  }else{
    acceptsCall = true
  }
  if(acceptsCall){
    display('Answering incoming call from ' + incoming.peer);
    var peer = getPeer(incoming.peer);
    peer.incoming = incoming;
    incoming.answer(myStream);
    peer.incoming.on('stream', function(stream) {
        addIncomingStream(peer, stream);
    });
    console.log('peerIds,:',peerIds)
    if(incoming.metadata!==undefined){
      if(peerIds.length>0){
        callPeers()
      }
    }
  }
  
  
}

// Add the new audio stream. Either from an incoming call, or
// from the response to one of our outgoing calls
function addIncomingStream(peer, stream) {
  display('Adding incoming stream from ' + peer.id);
  peer.incomingStream = stream;
  playStream(stream, peer.id);
}

// Create an <audio> element to play the audio stream
function playStream(stream,peerId) {
  //audio[0].src = (URL || webkitURL || mozURL).createObjectURL(stream);
  console.log(peerId)
  if(camera.find((id) => id === peerId) === undefined){
    camera.push(peerId)
    var videoElm = $('<video />', {
      id:peerId,
      autoplay:'autoplay',
      width:300,
      height:300
    });
    
    videoElm.appendTo($('#gallery'));
    var video = document.getElementById(peerId);
    video.srcObject=stream;
    window.peer_stream = stream;
  }
  
}

// Get access to the microphone
function getLocalAudioStream(cb) {
  display('Trying to access your microphone. Please click "Allow".');

  navigator.getUserMedia (
    {video: true, audio: true},

    function success(audioStream) {
      display('Microphone is open.');
      myStream = audioStream;
      
      if (cb) cb(null, myStream);
    },

    function error(err) {
      display('Couldn\'t connect to microphone. Reload the page to try again.');
      if (cb) cb(err);
    }
  );
}

////////////////////////////////////
// Helper functions
function getPeer(peerId) {
  return peers[peerId] || (peers[peerId] = {id: peerId});
}

function displayShareMessage() {
  display('Give someone this URL to chat.');
  display('<input type="text" value="' + location.href + '" readonly>');
  
  $('#display input').click(function() {
    this.select();
  });
}

function unsupported() {
  display("Your browser doesn't support getUserMedia.");
}

function display(message) {
  $('<div />').html(message).appendTo('#display');
}

document.getElementById("call").addEventListener("click", function(){
  
  peer_id = document.getElementById("peer_id").value;
  console.log(peer_id)
  
  var call = me.call(peer_id, myStream,{
    metadata: {
        'peerIds': peerIds
    }
});

  call.on('error', function(err) {
    display(err);
  });

  call.on('stream', function(stream) {
    display('Connected to ' + peer_id + '.');
    playStream(stream, peer_id);
  });

  peerIds.push(peer_id)
  console.log(peerIds)
})