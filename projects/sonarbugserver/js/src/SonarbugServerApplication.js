//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Export('sonarbugserver.SonarbugServerApplication')
//@Autoload

//@Require('Class')
//@Require('Obj')
//@Require('bugioc.BugIoc')
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
    var BugIoc                          = bugpack.require('bugioc.BugIoc');
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
            this.iocContext             = BugIoc.context();

            /**
             * @private
             * @type {ModuleTagScan}
             */
            this.moduleTagScan          = BugIoc.moduleScan(BugMeta.context());
        },


        //-------------------------------------------------------------------------------
        // Public Methods
        //-------------------------------------------------------------------------------

        /**
         * @param {function(Throwable=)} callback
         */
        start: function(callback) {
            try {
                this.moduleTagScan.scanAll();
                this.iocContext.generate();
            } catch(throwable) {
                return callback(throwable);
            }
            this.iocContext.start(callback);
        }
    });


    //-------------------------------------------------------------------------------
    // Exports
    //-------------------------------------------------------------------------------

    bugpack.export("sonarbugserver.SonarbugServerApplication", SonarbugServerApplication);
});
