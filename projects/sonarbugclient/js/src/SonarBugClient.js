//-------------------------------------------------------------------------------
// Requires
//-------------------------------------------------------------------------------

//@Package('sonarbugclient')

//@Export('SonarBugClient')

//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context();

//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------


//-------------------------------------------------------------------------------
//
//-------------------------------------------------------------------------------

// NOTE: <script src="/socket.io/socket.io.js"></script> REQUIRED IN THE HTML FILE
// <script>SonarBugClient.configure([hostname])</script>

var SonarBugClient = {

    socket: null,

    userID: null,

    visitID: null,

    configure: function(params, callback){
        SonarBugClient.userID = SonarBugClient.generateID();
        SonarBugClient.visitID = SonarBugClient.generateID();
        var socket = SonarBugClient.socket = io.connect(params.hostname || params);
        callback.fired = false;
        socket.on('connect', function(){
            if(!callback.fired){
                callback.fired = true;
                callback();
            } else {
                console.log('SonarBugClient configure callback tried to fire again :( ');
            }
        });
    },

    startTracking: function(){
        SonarBugClient.socket.emit('startTracking', {
            "eventName": 'connect',
            "userID": SonarBugClient.userID,
            "visitID": SonarBugClient.visitID,
            "data": {
                "timestamp": new Date()
            }
        });
    },

    track: function(eventName, data){
        var socket = SonarBugClient.socket;
        socket.emit('tracklog', {
            "eventName": eventName,
            "userID": SonarBugClient.userID,
            "visitID": SonarBugClient.visitID,
            "data": data
        });
    },

    generateID: function(){
        var s4 = function() {
          return Math.floor((1 + Math.random()) * 0x10000)
                     .toString(16)
                     .substring(1);
        };

        return  s4() + s4() + '-' + s4() + '-' + s4()
                + '-' + s4() + '-' + s4() + s4() + s4();
    }

};

//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

bugpack.export('sonarbugclient.SonarBugClient', SonarBugClient);