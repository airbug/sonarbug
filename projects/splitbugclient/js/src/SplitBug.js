//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Package('splitbug')

//@Export('SplitBug')

//@Require('Class')
//@Require('Obj')
//@Require('TypeUtil')
//@Require('splitbug.Cookies')
//@Require('splitbug.SplitBugClient')
//@Require('splitbug.SplitTestSession')
//@Require('splitbug.SplitTestUser')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context();


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var Class =             bugpack.require('Class');
var Obj =               bugpack.require('Obj');
var TypeUtil =          bugpack.require('TypeUtil');
var Cookies =           bugpack.require('splitbug.Cookies');
var SplitBugClient =    bugpack.require('splitbug.SplitBugClient');
var SplitTestSession =  bugpack.require('splitbug.SplitTestSession');
var SplitTestUser =     bugpack.require('splitbug.SplitTestUser');


//-------------------------------------------------------------------------------
// Declare Class
//-------------------------------------------------------------------------------

var SplitBug = Class.extend(Obj, {

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
         * @type {boolean}
         */
        this.configured = false;

        /**
         * @private
         * @type {SplitTestSession}
         */
        this.splitTestSession = null;

        /**
         * @private
         * @type {SplitTestUser}
         */
        this.splitTestUser = null;

        /**
         * @private
         * @type {SplitBugClient}
         */
        this.splitBugClient = null;
    },


    //-------------------------------------------------------------------------------
    // Getters and Setters
    //-------------------------------------------------------------------------------



    //-------------------------------------------------------------------------------
    // Public Class Methods
    //-------------------------------------------------------------------------------

    /**
     * @param {{
     *  host: ?string,
     *  port: ?number
     * }} params
     * @param {function(error)} callback
     */
    configure: function(params, callback) {
        var _this = this;
        if (!this.configured) {
            this.configured = true;
            var clientConfig = {
                port: params.port || 8080,
                host: params.host || "http://localhost"
            };
            this.splitBugClient = new SplitBugClient(clientConfig);
            this.setupSplitTestUser(function(error) {
                //TEST
                console.log("Setup of split test user complete");
                console.log(_this.splitTestUser);

                if (!error) {
                    _this.setupSplitTestSession(callback);
                } else {
                    callback(error);
                }
            });
        } else {
            callback(new Error("Cannot configure splitbug more than once"));
        }
    },

    /**
     * @return {boolean}
     */
    targetedForTest: function() {
        if (this.splitTestSession) {
            return this.splitTestSession.getTestName() !== null;
        } else {
            return false;
        }
    },

    /**
     * @param {{
     *  name: string,
     *  controlFunction: function(),
     *  testFunction: function()
     * }} params
     */
    splitTest: function(params) {
        if (!params) {
            throw new Error("params object is required");
        }
        if (!TypeUtil.isString(params.name)) {
            throw new Error("params.name must be a string");
        }
        if (!TypeUtil.isFunction(params.controlFunction)) {
            throw new Error("params.controlFunction must be a function");
        }
        if (!TypeUtil.isFunction(params.testFunction)) {
            throw new Error("params.testFunction must be a function");
        }
        if (this.targetedForTest() && this.splitTestSession.getTestName() === params.name) {
            //TODO BRN: Report to sonarbug that we are about to run the test
            if (this.splitTestSession.getTestGroup() === "test") {
                params.testFunction();
            } else {
                params.controlFunction();
            }
        } else {
            params.controlFunction();
        }
    },


    //-------------------------------------------------------------------------------
    // Private Class Methods
    //-------------------------------------------------------------------------------

    /**
     * @private
     * @param {SplitTestUser} splitTestUser
     * @param {function(Error, Object)} callback
     */
    establishSplitTestSession: function(splitTestUser, callback) {
        var data = {
            href: encodeURIComponent(window.location.href),
            userAgent: navigator.userAgent
        };
        this.splitBugClient.establishSplitTestSession(splitTestUser.getUserUuid(), data, function(error, splitTestSessionObject) {
            if (!error) {
                callback(null, new SplitTestSession(splitTestSessionObject));
            } else {
                callback(error);
            }
        });
    },

    /**
     * @private
     * @param {function(Error, SplitTestUser)} callback
     */
    generateSplitTestUser: function(callback) {
        this.splitBugClient.generateSplitTestUser(function(error, splitTestUserObject) {
            if (!error) {
                callback(null, new SplitTestUser(splitTestUserObject));
            } else {
                callback(error);
            }
        });
    },

    /**
     * @private
     * @param {function(Error)} callback
     */
    setupSplitTestSession: function(callback) {
        var _this = this;
        var splitTestSessionObject = this.retrieveSplitTestSessionFromCookies();
        if (splitTestSessionObject) {

            // NOTE BRN: We want to ensure we use the session in cookies when there is a failure to communicate with
            // the server. This way we don't show an alternate content until we are given a thumbs up or down.

            this.splitTestSession =  new SplitTestSession(splitTestSessionObject);
        }

        if (this.splitTestSession) {
            this.validateSplitTestSession(this.splitTestSession, function(error, valid) {
                if (!error) {
                    if (valid) {
                        callback();
                    } else {
                        _this.establishSplitTestSession(_this.splitTestUser, function(error, splitTestSession) {
                            if (!error) {
                                _this.splitTestSession = splitTestSession;
                                _this.storeSplitTestSessionToCookies(splitTestSession);
                                callback();
                            } else {
                                callback(error);
                            }
                        });
                    }
                } else {
                    callback(error);
                }
            })
        } else {
            this.establishSplitTestSession(this.splitTestUser, function(error, splitTestSession) {
                if (!error) {
                    _this.splitTestSession = splitTestSession;
                    _this.storeSplitTestSessionToCookies(splitTestSession);
                    callback();
                } else {
                    callback(error);
                }
            });
        }
    },

    /**
     * @private
     * @param {function(Error)} callback
     */
    setupSplitTestUser: function(callback) {
        var _this = this;
        var splitTestUserObject = this.retrieveSplitTestUserFromCookies();
        if (splitTestUserObject) {
            this.splitTestUser = new SplitTestUser(splitTestUserObject);

            //TEST
            console.log("Split test user loaded from cookies: ", this.splitTestUser);
        }
        if (!this.splitTestUser) {
            this.generateSplitTestUser(function(error, _splitTestUser) {
                if (!error) {
                    _this.splitTestUser = _splitTestUser;
                    _this.storeSplitTestUserToCookies(_splitTestUser);
                    callback();
                } else {
                    callback(error);
                }
            });
        } else {
            callback();
        }
    },

    /**
     * @private
     * @param {SplitTestSession} splitTestSession
     * @param {function(Error, boolean)} callback
     */
    validateSplitTestSession: function(splitTestSession, callback) {
        this.splitBugClient.validateSplitTestSession(splitTestSession.toObject(), function(error, valid) {
            if (!error) {
                callback(null, valid);
            } else {
                callback(error);
            }
        });
    },

    /**
     * @private
     * @return {Object}
     */
    retrieveSplitTestSessionFromCookies: function() {
        var sessionObject = Cookies.getCookie("splitbug-test-session");
        if (sessionObject) {
            sessionObject = JSON.parse(sessionObject);
        }
        return sessionObject;
    },

    /**
     * @private
     * @return {Object}
     */
    retrieveSplitTestUserFromCookies: function() {
        var splitTestUserObject = Cookies.getCookie("splitbug-test-user");
        if (splitTestUserObject) {
            splitTestUserObject = JSON.parse(splitTestUserObject);
        }
        return splitTestUserObject;
    },

    /**
     * @private
     * @param {SplitTestSession} splitTestSession
     */
    storeSplitTestSessionToCookies: function(splitTestSession) {
        var sessionObject = splitTestSession.toObject();
        Cookies.setCookie("splitbug-test-session", JSON.stringify(sessionObject), Infinity, "/");
    },

    /**
     * @private
     * @param {SplitTestUser} splitTestUser
     */
    storeSplitTestUserToCookies: function(splitTestUser) {
        var splitTestUserObject = splitTestUser.toObject();
        Cookies.setCookie("splitbug-test-user", JSON.stringify(splitTestUserObject), Infinity, "/");
    }
});


//-------------------------------------------------------------------------------
// Static Variables
//-------------------------------------------------------------------------------

SplitBug.instance = new SplitBug();


//-------------------------------------------------------------------------------
// Static Methods
//-------------------------------------------------------------------------------

/**
 * @static
 * @param {{
 *  name: string,
 *  controlFunction: function(),
 *  testFunction: function()
 * }}
 */
SplitBug.splitTest = function(params) {
    SplitBug.instance.splitTest(params);
};

/**
 * @static
 * @param {{
 *  host: ?string,
 *  port: ?number
 * }} params
 */
SplitBug.configure = function(params, callback) {
    SplitBug.instance.configure(params, callback);
};


//-------------------------------------------------------------------------------
// Exports
//-------------------------------------------------------------------------------

bugpack.export('splitbug.SplitBug', SplitBug);
