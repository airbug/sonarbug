//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Package('sonarbugserver')

//@Export('LogEventManager')

//@Require('Class')
//@Require('Event')
//@Require('EventDispatcher')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack         = require('bugpack').context();


//-------------------------------------------------------------------------------
// BugPack Modules
//-------------------------------------------------------------------------------

var Class           = bugpack.require('Class');
var Event           = bugpack.require('Event');
var EventDispatcher = bugpack.require('EventDispatcher');


//-------------------------------------------------------------------------------
// Declare Class
//-------------------------------------------------------------------------------

var LogEventManager = Class.extend(EventDispatcher, {

    //-------------------------------------------------------------------------------
    // Constructor
    //-------------------------------------------------------------------------------

    /**
     * @param {string} name
     */
    _constructor: function(name){

        this._super();


        //-------------------------------------------------------------------------------
        // Variables
        //-------------------------------------------------------------------------------

        /**
         * @private
         * @type {number}
         */
        this.moveCount = 0;

        /**
         * @private
         * @type {string}
         */
        this.name = name;
    },


    //-------------------------------------------------------------------------------
    // Getters and Setters
    //-------------------------------------------------------------------------------

    /**
     *
     */
    incrementMoveCount: function(){
        this.moveCount++;
    },

    /**
     *
     */
    decrementMoveCount: function(){
        this.moveCount -= 1;
        if (this.moveCount === 0) {
            this.dispatchReadyToPackageEvent();
        }
    },

    /**
     * @return {number}
     */
    getMoveCount: function(){
        return this.moveCount;
    },


    //-------------------------------------------------------------------------------
    // Private Methods
    //-------------------------------------------------------------------------------

    /**
     * @private
     */
    dispatchReadyToPackageEvent: function(){
        this.dispatchEvent(new Event("ready-to-package"));
        console.log("EventLogManager-" + this.name, "dispatched event: 'ready-to-package'");
    }
});


//-------------------------------------------------------------------------------
// Exports
//-------------------------------------------------------------------------------

bugpack.export('sonarbugserver.LogEventManager', LogEventManager);
