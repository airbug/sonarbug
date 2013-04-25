//-------------------------------------------------------------------------------
// Requires
//-------------------------------------------------------------------------------

//@Package('sonarbugclient')

//@Export('SonarBugClient')

//@Require('Queue')
//@Require('socket-io.SocketIo')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context();


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var Queue =     bugpack.require('Queue');
var SocketIo =  bugpack.require('socket-io.SocketIo');


//-------------------------------------------------------------------------------
// Declare Class
//-------------------------------------------------------------------------------

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
        SonarBugClient.hostname = params.hostname || params;
        SonarBugClient.configureCallback = callback;
        SonarBugClient.configureCallbackFired = false;
        SonarBugClient.connect();
    },

    /**
     *
     */
    startTracking: function() {
        SonarBugClient.track('connect', null);
    },

    /**
     * @param {string} eventName
     * @param {*} data
     */
    track: function(eventName, data) {
        SonarBugClient.queueTrackingEvent(eventName, data);

        if(SonarBugClient.isConnected){
            SonarBugClient.processTrackingQueue();
        } else {
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
            var socket = SonarBugClient.socket = SocketIo.connect(SonarBugClient.hostname, options);
            socket.on('connect', function() {
                SonarBugClient.isConnected = true;
                SonarBugClient.isConnecting = false;
                console.log('SonarBugClient is connected');
                SonarBugClient.processTrackingQueue();
                SonarBugClient.completeConfiguration();
            })
            .on('connect_error', function(error) {
                SonarBugClient.isConnecting = false;
                console.log('SonarBugClient connect_error:', error);
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
                SonarBugClient.processTrackingQueue();
                console.log('SonarBugClient reconnected');
            })
            .on('reconnect_error', function(error) {
                console.log('SonarBugClient reconnect_error:', error);
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
            });
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
        var timestamp = new Date();
        SonarBugClient.queue.enqueue(function() {
            SonarBugClient.sendTrackingEvent(eventName, timestamp, data);
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
     * @param {Date} timestamp
     * @param {Object} data
     */
    sendTrackingEvent: function(eventName, timestamp, data) {
        //TODO BRN: Should this be a unix time stamp instead?
        SonarBugClient.socket.emit('tracklog', {
            "eventName": eventName,
            "timestamp": timestamp,
            "data": data
        });
        console.log('SonarBugClient log:', eventName, timestamp, data);
    }
};


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

bugpack.export('sonarbugclient.SonarBugClient', SonarBugClient);
