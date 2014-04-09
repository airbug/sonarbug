//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Export('sonarbugclient.SonarbugClient')

//@Require('Class')
//@Require('Obj')
//@Require('Proxy')
//@Require('Queue')
//@Require('cookies.Cookies')
//@Require('session.SessionManager')
//@Require('socket-io.SocketIo')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context();


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var Class           = bugpack.require('Class');
var Obj             = bugpack.require('Obj');
var Proxy           = bugpack.require('Proxy');
var Queue           = bugpack.require('Queue');
var Cookies         = bugpack.require('cookies.Cookies');
var SessionManager  = bugpack.require('session.SessionManager');
var SocketIo        = bugpack.require('socket-io.SocketIo');


//-------------------------------------------------------------------------------
// Declare Class
//-------------------------------------------------------------------------------

var SonarbugClient = Class.extend(Obj, {

    //-------------------------------------------------------------------------------
    // Constructor
    //-------------------------------------------------------------------------------

    _constructor: function(sessionManager) {

        this._super();


        //-------------------------------------------------------------------------------
        // Private Properties
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
         * @type {boolean}
         */
        this.configured = false;

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
         * @type {SessionManager}
         */
        this.sessionManager = sessionManager;

        /**
         * @private
         * @type {*}
         */
        this.socket = null;

        /**
         * @private
         * @type {string}
         */
        this.version = "0.0.5";
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
        if (!this.configured) {
            this.configured = true;
            this.hostname = params.hostname || params;
            this.configureCallback = callback;
            this.configureCallbackFired = false;
            this.sessionManager.establishSession();
            this.connect();
        } else {
            throw new Error("SonarbugClient has alredy been configured.");
        }
    },

    /**
     *
     */
    startTracking: function() {
        if (this.configured) {
            var data = {
                "document": {},
                "navigator": {}
            };
            var document    = window.document;
            var navigator   = window.navigator;

            data.document.referrer          = document.referrer;
            data.navigator.appCodeName      = navigator.appCodeName;
            data.navigator.appName          = navigator.appName;
            data.navigator.appVersion       = navigator.appVersion;
            data.navigator.buildID          = navigator.buildID;
            data.navigator.cookieEnabled    = navigator.cookieEnabled;
            data.navigator.doNotTrack       = navigator.doNotTrack;
            data.navigator.language         = navigator.language;
            data.navigator.oscpu            = navigator.oscpu;
            data.navigator.platform         = navigator.platform;
            data.navigator.product          = navigator.product;
            data.navigator.productSub       = navigator.productSub;
            data.navigator.vendor           = navigator.vendor;
            data.navigator.vendorSub        = navigator.vendorSub;

            var session = this.sessionManager.getCurrentSession();

            data.sessionUuid = session.getSessionUuid();
            this.track('connect', data);
        } else {
            throw new Error("Must configure SonarbugClient before calling startTracking()");
        }
    },

    /**
     * @param {string} eventName
     * @param {*} data
     */
    track: function(eventName, data) {
        if (this.configured) {
            this.queueTrackingEvent(eventName, data);

            if(this.isConnected){
                this.processTrackingQueue();
            } else {
                this.connect();
            }
        } else {
            throw new Error("Must configure SonarbugClient before calling track()");
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
            console.log('SonarbugClient is attempting to connect...');
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
                console.log('SonarbugClient is connected');
                _this.processTrackingQueue();
                _this.completeConfiguration();
            })
            .on('connect_error', function(error) {
                _this.isConnecting = false;
                console.log('SonarbugClient connect_error:', error);
            })
            .on('connection_timeout', function() {
                _this.isConnecting = false;
                console.log('SonarbugClient connection_timeout');
            })
            .on('connect_failed', function() {
                _this.isConnecting = false;
                console.log('SonarbugClient connection_failed');
            })
            .on('reconnect', function(websocket) {
                _this.isConnected = true;
                _this.processTrackingQueue();
                console.log('SonarbugClient reconnected');
            })
            .on('reconnect_error', function(error) {
                console.log('SonarbugClient reconnect_error:', error);
            })
            .on('reconnect_failed', function() {
                console.log('SonarbugClient reconnect_failed');
            })
            .on('error', function(error) {
                _this.isConnecting = false;
                console.log('SonarbugClient error:', error);
                _this.retryConnect();
            })
            .on('disconnect', function() {
                _this.isConnecting = false;
                _this.isConnected = false;
                console.log('SonarbugClient disconnected');
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
        if (this.retryAttempts < SonarbugClient.retryLimit) {
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
        var version     = this.version;
        var location    = window.location.toString();
        this.socket.emit('tracklog', {
            "eventName": eventName,
            "timestamp": timestamp,
            "version": version,
            "location": location,
            "data": data
        });
        console.log('SonarbugClient tracklog:', "eventName:", eventName, ", timestamp:", timestamp, ", version:", version, ", location:", location, ", data:", data);
    }
});


//-------------------------------------------------------------------------------
// Static Class Variables
//-------------------------------------------------------------------------------

/**
 * @static
 * @type {SonarbugClient}
 */
SonarbugClient.instance = null;


//-------------------------------------------------------------------------------
// Static Class Methods
//-------------------------------------------------------------------------------

/**
 * @return {SonarbugClient}
 */
SonarbugClient.getInstance = function() {
    if (!SonarbugClient.instance) {
        var cookies = new Cookies(document);
        var sessionManager = new SessionManager(cookies);
        SonarbugClient.instance = new SonarbugClient(sessionManager);
    }
    return SonarbugClient.instance;
};

Proxy.proxy(SonarbugClient, Proxy.method(SonarbugClient.getInstance), [
    "configure",
    "startTracking",
    "track"
]);


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

bugpack.export('sonarbugclient.SonarbugClient', SonarbugClient);
