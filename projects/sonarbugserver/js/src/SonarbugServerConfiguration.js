//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Export('sonarbugserver.SonarbugServerConfiguration')
//@Autoload

//@Require('Class')
//@Require('Obj')
//@Require('bugioc.ArgTag')
//@Require('bugioc.ConfigurationTag')
//@Require('bugioc.IConfiguration')
//@Require('bugioc.ModuleTag')
//@Require('bugioc.PropertyTag')
//@Require('bugmeta.BugMeta')
//@Require('express.ExpressApp')
//@Require('express.ExpressServer')
//@Require('sonarbugserver.LogsManager')
//@Require('sonarbugserver.SonarbugServer')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack                 = require('bugpack').context();
var express                 = require('express');
var http                    = require('http');


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var Class                   = bugpack.require('Class');
var Obj                     = bugpack.require('Obj');
var ArgTag           = bugpack.require('bugioc.ArgTag');
var ConfigurationTag = bugpack.require('bugioc.ConfigurationTag');
var IConfiguration          = bugpack.require('bugioc.IConfiguration');
var ModuleTag        = bugpack.require('bugioc.ModuleTag');
var PropertyTag      = bugpack.require('bugioc.PropertyTag');
var BugMeta                 = bugpack.require('bugmeta.BugMeta');
var ExpressApp              = bugpack.require('express.ExpressApp');
var ExpressServer           = bugpack.require('express.ExpressServer');
var LogsManager             = bugpack.require('sonarbugserver.LogsManager');
var SonarbugServer          = bugpack.require('sonarbugserver.SonarbugServer');


//-------------------------------------------------------------------------------
// Simplify References
//-------------------------------------------------------------------------------

var bugmeta                 = BugMeta.context();
var arg                     = ArgTag.arg;
var configuration           = ConfigurationTag.configuration;
var module                  = ModuleTag.module;
var property                = PropertyTag.property;


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
     * @return {Express}
     */
    express: function() {
        return express;
    },

    /**
     * @return {ExpressApp}
     */
    expressApp: function(express) {
        return new ExpressApp(express);
    },

    /**
     * @param {http} http
     * @param {ExpressApp} expressApp
     * @return {ExpressServer}
     */
    expressServer: function(http, expressApp) {
        return new ExpressServer(http, expressApp);
    },

    /**
     * @return {*}
     */
    http: function() {
        return http;
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

bugmeta.tag(SonarbugServerConfiguration).with(
    configuration("sonarbugServerConfiguration").modules([
        module("express"),
        module("expressApp")
            .args([
                arg().ref("express")
            ]),
        module("expressServer")
            .args([
                arg().ref("http"),
                arg().ref("expressApp")
            ]),
        module("http"),
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
