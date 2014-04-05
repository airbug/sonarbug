//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Package('sonarbugserver')

//@Export('SonarbugServerApplication')
//@Autoload

//@Require('Class')
//@Require('Obj')
//@Require('bugioc.ConfigurationAnnotationProcessor')
//@Require('bugioc.ConfigurationScan')
//@Require('bugioc.ModuleAnnotationProcessor')
//@Require('bugioc.ModuleScan')
//@Require('bugioc.IocContext')
//@Require('bugmeta.BugMeta')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context();


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var Class                               = bugpack.require('Class');
var Obj                                 = bugpack.require('Obj');
var IocContext                          = bugpack.require('bugioc.IocContext');
var ConfigurationAnnotationProcessor    = bugpack.require('bugioc.ConfigurationAnnotationProcessor');
var ConfigurationScan                   = bugpack.require('bugioc.ConfigurationScan');
var ModuleAnnotationProcessor           = bugpack.require('bugioc.ModuleAnnotationProcessor');
var ModuleScan                          = bugpack.require('bugioc.ModuleScan');
var BugMeta                             = bugpack.require('bugmeta.BugMeta');


//-------------------------------------------------------------------------------
// Declare Class
//-------------------------------------------------------------------------------

var SonarbugServerApplication = Class.extend(Obj, {

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
         * @type {IocContext}
         */
        this.iocContext         = new IocContext();

        /**
         * @private
         * @type {ConfigurationScan}
         */
        this.configurationScan  = new ConfigurationScan(BugMeta.context(), new ConfigurationAnnotationProcessor(this.iocContext));

        /**
         * @private
         * @type {ModuleScan}
         */
        this.moduleScan         = new ModuleScan(BugMeta.context(), new ModuleAnnotationProcessor(this.iocContext));
    },


    //-------------------------------------------------------------------------------
    // Class Methods
    //-------------------------------------------------------------------------------

    /**
     * @param {function(Error)} callback
     */
    start: function(callback) {
        this.configurationScan.scanAll();
        this.moduleScan.scanAll();
        this.iocContext.process();
        this.iocContext.initialize(callback);
    }
});


//-------------------------------------------------------------------------------
// Exports
//-------------------------------------------------------------------------------

bugpack.export("sonarbugserver.SonarbugServerApplication", SonarbugServerApplication);
