//-------------------------------------------------------------------------------
// Requires
//-------------------------------------------------------------------------------

//@Package('sonarbug')

//@Export('LogEventManager')

//@Require('Class')
//@Require('Event')
//@Require('EventDispatcher')

//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack     = require('bugpack').context(module);

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
    // Public Static Methods
    //-------------------------------------------------------------------------------

    /**
     * @param {string} eventType
     * @param {function} listenerFunction
     * @param {} listenerContext
     */
    onceOn: function(eventType, listenerFunction, listenerContext){
        var _this = this;
        var newListenerFunction = function(){
            listenerFunction();
            _this.removeEventListener(eventType, newListenerFunction, listenerContext);
        };

        this.addEventListener(eventType, newListenerFunction, listenerContext);
    },

    //-------------------------------------------------------------------------------
    // Getters and Setters
    //-------------------------------------------------------------------------------

    incrementMoveCount: function(){
        this.moveCount++;
    },

    decrementMoveCount: function(){
        var moveCount = this.moveCount;
        moveCount -= 1;
        if(moveCount === 0) {
            this.dispatchEvent(new Event("ready-to-package"));
            console.log("EventLogManager-" + this.name, "dispatched event: 'ready-to-package'");
        }
    },

    /**
     * @return {number}
     */
    getMoveCount: function(){
        return this.moveCount;
    }
});

//-------------------------------------------------------------------------------
// Exports
//-------------------------------------------------------------------------------

bugpack.export('sonarbug.LogEventManager', LogEventManager);
