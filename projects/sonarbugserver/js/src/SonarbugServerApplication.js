//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Package('sonarbugserver')

//@Export('SonarbugServerApplication')
//@Autoload

//@Require('Class')
//@Require('Obj')
//@Require('bugioc.IocContext')
//@Require('bugioc.ConfigurationScan')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context();


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var Class               = bugpack.require('Class');
var Obj                 = bugpack.require('Obj');
var IocContext          = bugpack.require('bugioc.IocContext');
var ConfigurationScan   = bugpack.require('bugioc.ConfigurationScan');


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
        // Declare Variables
        //-------------------------------------------------------------------------------

        /**
         * @private
         * @type {IocContext}
         */
        this.iocContext = new IocContext();

        /**
         * @private
         * @type {ConfigurationScan}
         */
        this.configurationScan = new ConfigurationScan(this.iocContext);
    },


    //-------------------------------------------------------------------------------
    // Class Methods
    //-------------------------------------------------------------------------------

    /**
     * @param {function(Error)} callback
     */
    start: function(callback) {
        this.configurationScan.scan();
        this.iocContext.process();
        this.iocContext.initialize(callback);
    }
});


//-------------------------------------------------------------------------------
// Exports
//-------------------------------------------------------------------------------

bugpack.export("sonarbugserver.SonarbugServerApplication", SonarbugServerApplication);
