//-------------------------------------------------------------------------------
// Requires
//-------------------------------------------------------------------------------

//@Package('sonarbugclient')

//@Export('SonarBugClient')

//@Require('Queue')
//@Require('UuidGenerator')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context();


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var Queue =         bugpack.require('Queue');
var UuidGenerator = bugpack.require('UuidGenerator');


//-------------------------------------------------------------------------------
// Declare Class
//-------------------------------------------------------------------------------

// NOTE: <script src="/socket.io/socket.io.js"></script> not required in HTML
// unless socket.io.js is no longer loaded as a static js file
// NOTE: SonarBugClient is configured in SplashApplication.js

var SonarBugClient = {

    //-------------------------------------------------------------------------------
    // Static Variables
    //-------------------------------------------------------------------------------

    /**
     * @private
     * @type {function()}
     */
    configureCallback: null,

    /**
     * @private
     * @type {boolean}
     */
    configureCallbackFired: false,

    /**
     * @private
     * @type {string}
     */
    hostname: null,

    /**
     * @private
     * @type {boolean}
     */
    isConnected: false,

    /**
     * @private
     * @type {boolean}
     */
    isConnecting: false,

    /**
     * @private
     * @type {Queue}
     */
    queue: null,

    /**
     * @private
     * @type {number}
     */
    retryAttempts: 0,

    /**
     * @private
     * @type {number}
     */
    retryLimit: 3,

    /**
     * @private
     * @type {*}
     */
    socket: null,

    /**
     * @private
     * @type {string}
     */
    userID: null,

    /**
     * @private
     * @type {string}
     */
    visitID: null,


    //-------------------------------------------------------------------------------
    // Static Methods
    //-------------------------------------------------------------------------------

    /**
     * @param {{
     *  hostname: string
     * } | string } params
     * @param {function} callback
     */
    configure: function(params, callback) {
        SonarBugClient.queue = new Queue();
        SonarBugClient.userID = UuidGenerator.generateUuid();
        SonarBugClient.visitID = UuidGenerator.generateUuid();
        SonarBugClient.hostname = params.hostname || params;
        SonarBugClient.configureCallback = callback;
        SonarBugClient.configureCallbackFired = false;
        SonarBugClient.connect();
    },

    /**
     *
     */
    startTracking: function() {
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
            SonarBugClient.connect();
        }
    },

    /**
     * @param {string} eventName
     * @param {*} data
     */
    track: function(eventName, data) {
        if(SonarBugClient.isConnected){
            SonarBugClient.sendTrackingEvent(eventName, data);
        } else {
            SonarBugClient.queueTrackingEvent(eventName, data);
            SonarBugClient.connect();
        }
    },


    //-------------------------------------------------------------------------------
    // Private Static Methods
    //-------------------------------------------------------------------------------

    /**
     * @private
     * @param {Error=} error
     */
    completeConfiguration: function(error) {
        if (!SonarBugClient.configureCallbackFired){
            SonarBugClient.configureCallbackFired = true;
            if (SonarBugClient.configureCallback) {
                SonarBugClient.configureCallback(error);
            }
        }
    },

    /**
     * @private
     */
    connect: function() {
        if (!SonarBugClient.isConnected && !SonarBugClient.isConnecting) {
            SonarBugClient.isConnecting = true;
            console.log('SonarBugClient is attempting to connect...');
            var options = {
            //     port: 80
            //   , secure: false
            //   , document: 'document' in global ? document : false,
                resource: 'socket-api' // defaults to 'socket.io'
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
            socket.on('connect', function() {
                SonarBugClient.isConnected = true;
                SonarBugClient.isConnecting = false;
                console.log('SonarBugClient is connected');
                SonarBugClient.processTrackingQueue();
                SonarBugClient.completeConfiguration();
            })
            .on('connect_error', function(error) {
                SonarBugClient.isConnecting = false;
                console.log('SonarBugClient connect_error', error);
            })
            .on('connection_timeout', function() {
                SonarBugClient.isConnecting = false;
                console.log('SonarBugClient connection_timeout');
            })
            .on('connect_failed', function() {
                SonarBugClient.isConnecting = false;
                console.log('SonarBugClient connection_failed');
            })
            .on('reconnect', function(websocket) {
                SonarBugClient.isConnected = true;
                console.log('SonarBugClient reconnected');
            })
            .on('reconnect_error', function(error) {
                console.log('SonarBugClient reconnect_error', error);
            })
            .on('reconnect_failed', function() {
                console.log('SonarBugClient reconnect_failed');
            })
            .on('error', function(error) {
                SonarBugClient.isConnecting = false;
                console.log('SonarBugClient error:', error);
                SonarBugClient.retryConnect();
            })
            .on('disconnect', function() {
                SonarBugClient.isConnecting = false;
                SonarBugClient.isConnected = false;
                console.log('SonarBugClient disconnected');
                // socket.io automatically attempts to reconnect on disconnect
                // defaults to 10 attempts
            });

            SonarBugClient.socket.socket.connect();
        }
    },

    /**
     * @private
     */
    processTrackingQueue: function() {
        while (!SonarBugClient.queue.isEmpty() && SonarBugClient.isConnected){
            var wrappedFunction = SonarBugClient.queue.dequeue();
            wrappedFunction();
        }
    },

    /**
     * @private
     * @param {string} eventName
     * @param {Object} data
     */
    queueTrackingEvent: function(eventName, data) {
        SonarBugClient.queue.enqueue(function() {
            SonarBugClient.sendTrackingEvent(eventName, data);
        });
    },

    /**
     * @private
     */
    retryConnect: function() {
        if (SonarBugClient.retryAttempts < SonarBugClient.retryLimit) {
            SonarBugClient.retryAttempts++;
            SonarBugClient.connect();
        } else {
            SonarBugClient.completeConfiguration(new Error("Maximum retries reached. Could not connect to sonarbug server."));
        }
    },

    /**
     * @private
     * @param {string} eventName
     * @param {Object} data
     */
    sendTrackingEvent: function(eventName, data) {
        //TODO BRN: Should this be a unix time stamp instead?
        var timestamp = new Date();
        SonarBugClient.socket.emit('tracklog', {
            "eventName": eventName,
            "userID": SonarBugClient.userID,
            "visitID": SonarBugClient.visitID,
            "timestamp": timestamp,
            "data": data
        });
        console.log('SonarBugClient log:', eventName, SonarBugClient.userID, SonarBugClient.visitID, timestamp, data);
    }
};


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

bugpack.export('sonarbugclient.SonarBugClient', SonarBugClient);
