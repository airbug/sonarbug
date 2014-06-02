//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Export('sonarbugserver.SonarbugServerApplication')
//@Autoload

//@Require('Class')
//@Require('Obj')
//@Require('bugioc.ConfigurationTagProcessor')
//@Require('bugioc.ConfigurationTagScan')
//@Require('bugioc.ModuleTagProcessor')
//@Require('bugioc.ModuleTagScan')
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
var ConfigurationTagProcessor    = bugpack.require('bugioc.ConfigurationTagProcessor');
var ConfigurationTagScan                   = bugpack.require('bugioc.ConfigurationTagScan');
var ModuleTagProcessor           = bugpack.require('bugioc.ModuleTagProcessor');
var ModuleTagScan                          = bugpack.require('bugioc.ModuleTagScan');
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
         * @type {ConfigurationTagScan}
         */
        this.configurationTagScan  = new ConfigurationTagScan(BugMeta.context(), new ConfigurationTagProcessor(this.iocContext));

        /**
         * @private
         * @type {ModuleTagScan}
         */
        this.moduleTagScan         = new ModuleTagScan(BugMeta.context(), new ModuleTagProcessor(this.iocContext));
    },


    //-------------------------------------------------------------------------------
    // Class Methods
    //-------------------------------------------------------------------------------

    /**
     * @param {function(Error)} callback
     */
    start: function(callback) {
        this.configurationTagScan.scanAll();
        this.moduleTagScan.scanAll();
        this.iocContext.process();
        this.iocContext.initialize(callback);
    }
});


//-------------------------------------------------------------------------------
// Exports
//-------------------------------------------------------------------------------

bugpack.export("sonarbugserver.SonarbugServerApplication", SonarbugServerApplication);
