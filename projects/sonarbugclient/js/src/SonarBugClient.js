//-------------------------------------------------------------------------------
// Requires
//-------------------------------------------------------------------------------

//@Package('sonarbugclient')

//@Export('SonarBugClient')

//@Require('Class')
//@Require('Obj')
//@Require('Proxy')
//@Require('Queue')
//@Require('socket-io.SocketIo')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context();


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var Class =     bugpack.require('Class');
var Obj =       bugpack.require('Obj');
var Proxy =     bugpack.require('Proxy');
var Queue =     bugpack.require('Queue');
var SocketIo =  bugpack.require('socket-io.SocketIo');


//-------------------------------------------------------------------------------
// Declare Class
//-------------------------------------------------------------------------------

var SonarBugClient = Class.extend(Obj, {

    //-------------------------------------------------------------------------------
    // Constructor
    //-------------------------------------------------------------------------------

    _constructor: function() {

        this._super();


        //-------------------------------------------------------------------------------
        // Declare Variables
        //-------------------------------------------------------------------------------

        /**
         * @private
         * @type {function()}
         */
        this.configureCallback = null;

        /**
         * @private
         * @type {boolean}
         */
        this.configureCallbackFired = false;

        /**
         * @private
         * @type {string}
         */
        this.hostname = null;

        /**
         * @private
         * @type {boolean}
         */
        this.isConnected = false;

        /**
         * @private
         * @type {boolean}
         */
        this.isConnecting = false;

        /**
         * @private
         * @type {Queue}
         */
        this.queue = new Queue();

        /**
         * @private
         * @type {number}
         */
        this.retryAttempts = 0;

        /**
         * @private
         * @type {number}
         */
        this.retryLimit = 3;

        /**
         * @private
         * @type {*}
         */
        this.socket = null;
    },


    //-------------------------------------------------------------------------------
    // Class Methods
    //-------------------------------------------------------------------------------

    /**
     * @param {{
     *  hostname: string
     * } | string } params
     * @param {function} callback
     */
    configure: function(params, callback) {
        this.hostname = params.hostname || params;
        this.configureCallback = callback;
        this.configureCallbackFired = false;
        this.connect();
    },

    /**
     *
     */
    startTracking: function() {
        this.track('connect', null);
    },

    /**
     * @param {string} eventName
     * @param {*} data
     */
    track: function(eventName, data) {
        this.queueTrackingEvent(eventName, data);

        if(this.isConnected){
            this.processTrackingQueue();
        } else {
            this.connect();
        }
    },


    //-------------------------------------------------------------------------------
    // Private Class Methods
    //-------------------------------------------------------------------------------

    /**
     * @private
     * @param {Error=} error
     */
    completeConfiguration: function(error) {
        if (!this.configureCallbackFired){
            this.configureCallbackFired = true;
            if (this.configureCallback) {
                this.configureCallback(error);
            }
        }
    },

    /**
     * @private
     */
    connect: function() {
        var _this = this;
        if (!this.isConnected && !this.isConnecting) {
            this.isConnecting = true;
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
            var socket = this.socket = SocketIo.connect(this.hostname, options);
            socket.on('connect', function() {
                _this.isConnected = true;
                _this.isConnecting = false;
                console.log('SonarBugClient is connected');
                _this.processTrackingQueue();
                _this.completeConfiguration();
            })
            .on('connect_error', function(error) {
                _this.isConnecting = false;
                console.log('SonarBugClient connect_error:', error);
            })
            .on('connection_timeout', function() {
                _this.isConnecting = false;
                console.log('SonarBugClient connection_timeout');
            })
            .on('connect_failed', function() {
                _this.isConnecting = false;
                console.log('SonarBugClient connection_failed');
            })
            .on('reconnect', function(websocket) {
                _this.isConnected = true;
                _this.processTrackingQueue();
                console.log('SonarBugClient reconnected');
            })
            .on('reconnect_error', function(error) {
                console.log('SonarBugClient reconnect_error:', error);
            })
            .on('reconnect_failed', function() {
                console.log('SonarBugClient reconnect_failed');
            })
            .on('error', function(error) {
                _this.isConnecting = false;
                console.log('SonarBugClient error:', error);
                _this.retryConnect();
            })
            .on('disconnect', function() {
                _this.isConnecting = false;
                _this.isConnected = false;
                console.log('SonarBugClient disconnected');
            });
        }
    },

    /**
     * @private
     */
    processTrackingQueue: function() {
        while (!this.queue.isEmpty() && this.isConnected){
            var wrappedFunction = this.queue.dequeue();
            wrappedFunction();
        }
    },

    /**
     * @private
     * @param {string} eventName
     * @param {Object} data
     */
    queueTrackingEvent: function(eventName, data) {
        var _this = this;
        var timestamp = new Date();
        this.queue.enqueue(function() {
            _this.sendTrackingEvent(eventName, timestamp, data);
        });
    },

    /**
     * @private
     */
    retryConnect: function() {
        if (this.retryAttempts < SonarBugClient.retryLimit) {
            this.retryAttempts++;
            this.connect();
        } else {
            this.completeConfiguration(new Error("Maximum retries reached. Could not connect to sonarbug server."));
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
        this.socket.emit('tracklog', {
            "eventName": eventName,
            "timestamp": timestamp,
            "data": data
        });
        console.log('SonarBugClient log:', eventName, timestamp, data);
    }
});


//-------------------------------------------------------------------------------
// Static Class Methods
//-------------------------------------------------------------------------------

/**
 * @static
 * @type {SonarBugClient}
 */
SonarBugClient.instance = null;

/**
 * @return {SonarBugClient}
 */
SonarBugClient.getInstance = function() {
    if (!SonarBugClient.instance) {
        SonarBugClient.instance = new SonarBugClient();
    }
    return SonarBugClient.instance;
};

Proxy.proxy(SonarBugClient, SonarBugClient.getInstance, [
    "configure",
    "startTracking",
    "track"
]);


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

bugpack.export('sonarbugclient.SonarBugClient', SonarBugClient);
