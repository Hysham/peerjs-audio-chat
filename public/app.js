// Handle prefixed versions
navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

// State
var me = {};
var myStream;
var peers = {};
var camera = []
var peerIds = []
var my_peer_id;
var heartbeater

// Start everything up
function init() {
  if (!navigator.getUserMedia) return unsupported();

  getLocalAudioStream(function(err, stream) {
    if (err || !stream) return;
    
    connectToPeerJS(function(err) {
      if (err) return;
      
      // registerIdWithServer(me.id);
      console.log('peer length: ',call.peers.length)
      playStream(stream, me.id)
      // if (call.peers.length) callPeers();
      // else displayShareMessage();
    });
  });
}

function makePeerHeartbeater ( peer ) {
  var timeoutId = 0;
  function heartbeat () {
      timeoutId = setTimeout( heartbeat, 20000 );
      if ( peer.socket._wsOpen() ) {
          console.log('1')
          peer.socket.send( {type:'HEARTBEAT'} );
      }
  }
  // Start 
  heartbeat();
  // return
  return {
      start : function () {
          if ( timeoutId === 0 ) { heartbeat(); }
      },
      stop : function () {
          clearTimeout( timeoutId );
          timeoutId = 0;
      }
  };
}

// Connect to PeerJS and get an ID
function connectToPeerJS(cb) {
  display('Connecting to PeerJS...');
  me = new Peer(my_peer_id,{
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
    heartbeater = makePeerHeartbeater( me );
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

  peer.outgoing.on('close', function() {
    console.log('connection closed');
    getOutgoingSessions((sessions)=>{
      sessions.forEach((session)=>{
        //video_stream = document.getElementById(id).srcObject
        if(!session.outgoing.open){
          delete peers[session.id]
          $("#"+session.id).remove();
          camera = camera.filter(function(id) {
            return id !== session.id
          })
        }
      })
    })
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
    let rIds = JSON.parse(incoming.metadata.peerIds)
    peerIds = peerIds.concat(rIds.ids)
    
  }else{
    acceptsCall = true
  }


  if(acceptsCall){
    display('Answering incoming call from ' + incoming.peer);
    var peer = getPeer(incoming.peer);
    peer.incoming = incoming;
    console.log('============')
    incoming.answer(myStream);
    peer.incoming.on('stream', function(stream) {
        addIncomingStream(peer, stream);
        console.log(peers)
    });

    peer.incoming.on('close', function() {
      console.log('-connection closed');
      // let video_stream
      getIncommingSessions((sessions)=>{
        sessions.forEach((session)=>{
          //video_stream = document.getElementById(id).srcObject
          if(!session.incoming.open){
            delete peers[session.id]
            $("#"+session.id).remove();
            camera = camera.filter(function(id) {
              return id !== session.id
            })
          }
        })
      })
      console.log(peers)
    });

    peer.incoming.on('error', function(err) {
      display(err);
    });

    console.log('peerIds,:',peerIds)
    if(incoming.metadata!==undefined){
      peerIds = peerIds.filter((id)=>{
        return id!==my_peer_id
      })
      if(peerIds.length>0){
        callPeers()
      }
    }
  }
  
  
}

function getIncommingSessions(cb){
    let sessions = []
    Object.keys(peers).forEach(function(key) {
      
      if(peers[key].incoming !== undefined){
        sessions.push(peers[key])
      }
    
    });

    cb(sessions)
}

function getOutgoingSessions(cb){
  let sessions = []
  Object.keys(peers).forEach(function(key) {
    
    if(peers[key].outgoing !== undefined){
      sessions.push(peers[key])
    }
  
  });

  cb(sessions)
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
  console.log('playStream: ',peerId)
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
  }else{
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

  document.getElementById("btnCall").addEventListener("click", function(){
    
          peer_id = document.getElementById("peer_id").value;
          console.log(peer_id)
          var peer = getPeer(peer_id);
          let remoteIds = {ids:peerIds}
          
          peer.outgoing = me.call(peer_id, myStream,{
            metadata: {
                "peerIds": JSON.stringify(remoteIds)
            }
          });

          peer.outgoing.on('error', function(err) {
            display(err);
          });

          peer.outgoing.on('stream', function(stream) {
            display('Connected to ' + peer_id + '.');
            playStream(stream, peer_id);
            //document.getElementById("btnCall").className += " hidden";
            //document.getElementById("btnReject").className = " btn btn-danger";
          });

          peer.outgoing.on('close', function() {
            console.log('connection closed');
            getOutgoingSessions((sessions)=>{
              sessions.forEach((session)=>{
                //video_stream = document.getElementById(id).srcObject
                if(!session.outgoing.open){
                  delete peers[session.id]
                  $("#"+session.id).remove();
                  camera = camera.filter(function(id) {
                    return id !== session.id
                  })
                }
              })
            })
          });

          peerIds.push(peer_id)
          console.log(peerIds)
          console.log(peers)
  })

  document.getElementById("btnPeerId").addEventListener("click", function(){
    
    my_peer_id = document.getElementById("peerId").value;
    console.log(my_peer_id)
    document.getElementById("peer-id-label").innerHTML = "ID :"+ my_peer_id
    init();
  })

  document.getElementById("btnReject").addEventListener("click", function(){
     me.destroy();
     init();
    // document.getElementById("btnReject").className = "btn btn-danger hidden";
     //document.getElementById("btnCall").className = "btn btn-success";
  })