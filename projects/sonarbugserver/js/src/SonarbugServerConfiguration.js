//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Package('sonarbugserver')

//@Export('SonarbugServerConfiguration')
//@Autoload

//@Require('Class')
//@Require('Obj')
//@Require('bugioc.ArgAnnotation')
//@Require('bugioc.ConfigurationAnnotation')
//@Require('bugioc.IConfiguration')
//@Require('bugioc.ModuleAnnotation')
//@Require('bugioc.PropertyAnnotation')
//@Require('bugmeta.BugMeta')
//@Require('express.ExpressApp')
//@Require('express.ExpressServer')
//@Require('sonarbugserver.LogsManager')
//@Require('sonarbugserver.SonarbugServer')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context();


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var Class                   = bugpack.require('Class');
var Obj                     = bugpack.require('Obj');
var ArgAnnotation           = bugpack.require('bugioc.ArgAnnotation');
var ConfigurationAnnotation = bugpack.require('bugioc.ConfigurationAnnotation');
var IConfiguration          = bugpack.require('bugioc.IConfiguration');
var ModuleAnnotation        = bugpack.require('bugioc.ModuleAnnotation');
var PropertyAnnotation      = bugpack.require('bugioc.PropertyAnnotation');
var BugMeta                 = bugpack.require('bugmeta.BugMeta');
var ExpressApp              = bugpack.require('express.ExpressApp');
var ExpressServer           = bugpack.require('express.ExpressServer');
var LogsManager             = bugpack.require('sonarbugserver.LogsManager');
var SonarbugServer          = bugpack.require('sonarbugserver.SonarbugServer');


//-------------------------------------------------------------------------------
// Simplify References
//-------------------------------------------------------------------------------

var bugmeta                 = BugMeta.context();
var arg                     = ArgAnnotation.arg;
var configuration           = ConfigurationAnnotation.configuration;
var module                  = ModuleAnnotation.module;
var property                = PropertyAnnotation.property;


//-------------------------------------------------------------------------------
// Declare Class
//-------------------------------------------------------------------------------

var SonarbugServerConfiguration = Class.extend(Obj, {

    //-------------------------------------------------------------------------------
    // Constructor
    //-------------------------------------------------------------------------------

    _constructor: function() {

        this._super();


        //-------------------------------------------------------------------------------
        // Private Properties
        //-------------------------------------------------------------------------------

        /**
         * @private
         * @type {SonarbugServer}
         */
        this._sonarbugServer = null;
    },


    //-------------------------------------------------------------------------------
    // IConfiguration Implementation
    //-------------------------------------------------------------------------------

    /**
     * @param {function(Throwable=)} callback
     */
    deinitializeConfiguration: function(callback) {
        callback();
    },

    /**
     * @param {function(Throwable=)} callback
     */
    initializeConfiguration: function(callback) {
        this._sonarbugServer.start(callback);
    },


    //-------------------------------------------------------------------------------
    // Public Methods
    //-------------------------------------------------------------------------------

    /**
     * @return {ExpressApp}
     */
    expressApp: function() {
        return new ExpressApp();
    },

    /**
     * @param {ExpressApp} expressApp
     * @return {ExpressServer}
     */
    expressServer: function(expressApp) {
        return new ExpressServer(expressApp);
    },

    /**
     * @return {LogsManager}
     */
    logsManager: function() {
        return new LogsManager();
    },

    /**
     * @return {SonarbugServer}
     */
    sonarbugServer: function() {
        this._sonarbugServer = new SonarbugServer();
        return this._sonarbugServer;
    }
});


//-------------------------------------------------------------------------------
// Interfaces
//-------------------------------------------------------------------------------

Class.implement(SonarbugServerConfiguration, IConfiguration);


//-------------------------------------------------------------------------------
// BugMeta
//-------------------------------------------------------------------------------

bugmeta.annotate(SonarbugServerConfiguration).with(
    configuration("sonarbugServerConfiguration").modules([
        module("expressApp"),
        module("expressServer")
            .args([
                arg().ref("expressApp")
            ]),
        module("logsManager"),
        module("sonarbugServer")
            .properties([
                property("expressApp").ref("expressApp"),
                property("expressServer").ref("expressServer"),
                property("logsManager").ref("logsManager")
            ])
    ])
);


//-------------------------------------------------------------------------------
// Exports
//-------------------------------------------------------------------------------

bugpack.export("sonarbugserver.SonarbugServerConfiguration", SonarbugServerConfiguration);
