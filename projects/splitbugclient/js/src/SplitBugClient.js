//TODO BRN: Remove the dependency on jquery. Should write a simple ajax library.

//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Package('splitbug')

//@Export('SplitBugClient')

//@Require('Class')
//@Require('Obj')
//@Require('TypeUtil')


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


//-------------------------------------------------------------------------------
// Declare Class
//-------------------------------------------------------------------------------

var SplitBugClient = Class.extend(Obj, {

    //-------------------------------------------------------------------------------
    // Constructor
    //-------------------------------------------------------------------------------

    _constructor: function(config) {

        this._super();


        //-------------------------------------------------------------------------------
        // Declare Variables
        //-------------------------------------------------------------------------------

        /**
         * @private
         * @type {string}
         */
        this.host = config.host;

        /**
         * @private
         * @type {number}
         */
        this.port = config.port;
    },


    //-------------------------------------------------------------------------------
    // Public Class Methods
    //-------------------------------------------------------------------------------

    /**
     * @param {string} userUuid
     * @param {Object} data
     * @param {function(Error, {userUuid: string, sessionUuid: string, testGroup: string, testName: string})}
     */
    establishSplitTestSession: function(userUuid, data, callback) {
        var url = this.buildSplitBugApiUrl() + "/api/split-test-session/establish";
        var dataObject = {
            userUuid: userUuid,
            data: data
        };
        this.makeAjaxRequest(url, dataObject, function(error, response) {
            if (!error) {
                callback(null, response.data.splitTestSession);
            } else {
                callback(error);
            }
        });
    },

    /**
     * @param {function(Error, {userUuid: string})}
     */
    generateSplitTestUser: function(callback) {
        var url = this.buildSplitBugApiUrl() + "/api/split-test-user/generate";
        var dataObject = {};
        this.makeAjaxRequest(url, dataObject, function(error, response) {
            if (!error) {
                callback(null, response.data.splitTestUser);
            } else {
                callback(error);
            }
        });
    },

    /**
     * @param {Object} splitTestObject
     * @param {function(Error, boolean)} callback
     */
    validateSplitTestSession: function(splitTestObject, callback) {
        var url = this.buildSplitBugApiUrl() + "/api/split-test-session/validate";
        var dataObject = {
            splitTestSession: splitTestObject
        };
        this.makeAjaxRequest(url, dataObject, function(error, response) {
            if (!error) {
                callback(null, response.data.valid);
            } else {
                callback(error);
            }
        })
    },


    //-------------------------------------------------------------------------------
    // Private Class Methods
    //-------------------------------------------------------------------------------

    /**
     * @private
     * @return {string}
     */
    buildSplitBugApiUrl: function() {
        var url = this.host;
        if (this.port) {
            url += ":" + this.port;
        }
        return url;
    },

    /**
     * @private
     * @param {string} url
     * @param {Object} dataObject
     * @param {function(Error, Object)} callback
     */
    makeAjaxRequest: function(url, dataObject, callback) {
        $.ajax({
            url: url,
            contentType: "application/json",
            dataType: "json",
            data: JSON.stringify(dataObject),
            processData: false,
            crossDomain: true,
            type: "POST",
            error: function(jqXHR, textStatus, errorThrown) {
                var error = {
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    errorThrown: errorThrown
                };
                callback(error);
            },
            success: function(data, textStatus, jqXHR) {
                var response = {
                    data: data,
                    textStatus: textStatus,
                    jqXHR: jqXHR
                };
                callback(null, response);
            }
        });
    }
});


//-------------------------------------------------------------------------------
// Exports
//-------------------------------------------------------------------------------

bugpack.export('splitbug.SplitBugClient', SplitBugClient);
