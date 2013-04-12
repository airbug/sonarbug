//-------------------------------------------------------------------------------
// Requires
//-------------------------------------------------------------------------------

//@Package('sonarbugclient')

//@Export('SonarBugClient')

//@Require('Queue')

//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context();

//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var Queue = bugpack.require('Queue');

//-------------------------------------------------------------------------------
// Declare Class
//-------------------------------------------------------------------------------

// NOTE: <script src="/socket.io/socket.io.js"></script> not required in HTML
// unless socket.io.js is no longer loaded as a static js file
// NOTE: SonarBugClient is configured in SplashApplication.js

var SonarBugClient = {

    configureCallback: null,

    hostname: null,

    isConnected: false,

    queue: null,

    socket: null,

    userID: null,

    visitID: null,

    /**
     * @param {{
     *  hostname: string
     * } | string } params
     * @param {function} callback
     */
    configure: function(params, callback){
        SonarBugClient.queue = new Queue();
        SonarBugClient.userID = SonarBugClient.generateID();
        SonarBugClient.visitID = SonarBugClient.generateID();
        SonarBugClient.hostname = params.hostname || params;
        SonarBugClient.configureCallback = callback;
        SonarBugClient.configureCallback.fired = false;
        SonarBugClient.connect();
    },

    startTracking: function(){
        var queue = SonarBugClient.queue;
        var timestamp = new Date();

        queue.enqueue(function(){
            SonarBugClient.socket.emit('startTracking', {
                "eventName": 'connect',
                "userID": SonarBugClient.userID,
                "visitID": SonarBugClient.visitID,
                "timestamp": timestamp,
                "data": null
            });
            console.log('SonarBugClient log:', SonarBugClient.userID, SonarBugClient.visitID, timestamp);
        });

        if(SonarBugClient.isConnected){
            while(!queue.isEmpty() && SonarBugClient.isConnected){
                var wrappedFunction = queue.dequeue();
                wrappedFunction();
                console.log('dequeued', wrappedFunction);
            }
        } else {
            SonarBugClient.connect(SonarBugClient.configureCallback);
        }
    },

    /**
     * @param {string} eventName
     * @param {*} data
     */
    track: function(eventName, data){
        var queue = SonarBugClient.queue;
        var timestamp = new Date();

        queue.enqueue(function(){
            SonarBugClient.socket.emit('tracklog', {
                "eventName": eventName,
                "userID": SonarBugClient.userID,
                "visitID": SonarBugClient.visitID,
                "timestamp": timestamp,
                "data": data
            });
            console.log('SonarBugClient log:', eventName, SonarBugClient.userID, SonarBugClient.visitID, timestamp, data);
        });

        if(SonarBugClient.isConnected){
            while(!queue.isEmpty() && SonarBugClient.isConnected){
                var wrappedFunction = queue.dequeue();
                wrappedFunction();
            }
        } else {
            SonarBugClient.connect(SonarBugClient.configureCallback);
        }
    },

    /**
     * @private
     */
    connect: function(){
        console.log('SonarBugClient is attempting to connect...');
        var options = {
        //     port: 80
        //   , secure: false
        //   , document: 'document' in global ? document : false,
            resource: 'socketApi' // defaults to 'socket.io'
        //   , transports: io.transports
        //   , 'connect timeout': 10000
        //   , 'try multiple transports': true
        //   , 'reconnect': true
        //   , 'reconnection delay': 500
        //   , 'reconnection limit': Infinity
        //   , 'reopen delay': 3000
        //   , 'max reconnection attempts': 10
        //   , 'sync disconnect on unload': false
        //   , 'auto connect': true
        //   , 'flash policy port': 10843
        //   , 'manualFlush': false
        };
        var socket = SonarBugClient.socket = io.connect(SonarBugClient.hostname, options);
        socket.on('connect', function(){
            SonarBugClient.isConnected = true;
            console.log('SonarBugClient is connected');

            while(!SonarBugClient.queue.isEmpty() && SonarBugClient.isConnected){
                var wrappedFunction = SonarBugClient.queue.dequeue();
                wrappedFunction();
            }

            if(!SonarBugClient.configureCallback.fired){
                SonarBugClient.configureCallback.fired = true;
                SonarBugClient.configureCallback();
            }
        })
        .on('connect_error', function(error){
            console.log('SonarBugClient connect_error', error);
        })
        .on('connection_timeout', function(){
            console.log('SonarBugClient connection_timeout');
        })
        .on('connect_failed', function(){
            console.log('SonarBugClient connection_failed');
        })
        .on('reconnect', function(websocket){
            SonarBugClient.isConnected = true;
            console.log('SonarBugClient reconnected');
        })
        .on('reconnect_error', function(error){
            console.log('SonarBugClient reconnect_error', error);
        })
        .on('reconnect_failed', function(){
            console.log('SonarBugClient reconnect_failed');
        })
        .on('error', function(error){
            console.log('SonarBugClient error:', error);
        })
        .on('disconnect', function(){
            SonarBugClient.isConnected = false;
            console.log('SonarBugClient disconnected');
            // socket.io automatically attempts to reconnect on disconnect
            // defaults to 10 attempts
            // NOTE: SUNG may want to create a longer running interval here
        });

        //NOTE: To ensure websocket connection
        var reconnectInterval = window.setInterval(function(){
            if(!SonarBugClient.isConnected){
                SonarBugClient.socket.socket.connect();
            } else {
                window.clearInterval(reconnectInterval);
                console.log('cleared SonarBugClient reconnectInterval');
            }
        }, 700);
    },

    /**
     * @private
     * @return {string}
     */
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