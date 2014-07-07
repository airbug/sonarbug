//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Export('sonarbugserver.SonarbugServerApplication')
//@Autoload

//@Require('Class')
//@Require('Obj')
//@Require('bugioc.ModuleTagProcessor')
//@Require('bugioc.ModuleTagScan')
//@Require('bugioc.IocContext')
//@Require('bugmeta.BugMeta')


//-------------------------------------------------------------------------------
// Context
//-------------------------------------------------------------------------------

require('bugpack').context("*", function(bugpack) {

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

    /**
     * @class
     * @extends {Obj}
     */
    var SonarbugServerApplication = Class.extend(Obj, {

        _name: "sonarbugserver.SonarbugServerApplication",


        //-------------------------------------------------------------------------------
        // Constructor
        //-------------------------------------------------------------------------------

        /**
         * @constructs
         */
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
             * @type {ModuleTagScan}
             */
            this.moduleTagScan      = new ModuleTagScan(BugMeta.context(), new ModuleTagProcessor(this.iocContext));
        },


        //-------------------------------------------------------------------------------
        // Public Methods
        //-------------------------------------------------------------------------------

        /**
         * @param {function(Throwable=)} callback
         */
        start: function(callback) {
            this.moduleTagScan.scanAll();
            this.iocContext.generate();
            this.iocContext.initialize(callback);
        }
    });


    //-------------------------------------------------------------------------------
    // Exports
    //-------------------------------------------------------------------------------

    bugpack.export("sonarbugserver.SonarbugServerApplication", SonarbugServerApplication);
});
