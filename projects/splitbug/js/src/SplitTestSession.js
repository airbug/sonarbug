//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Package('splitbug')

//@Export('SplitTestSession')

//@Require('Class')
//@Require('Obj')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context();


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var Class = bugpack.require('Class');
var Obj =   bugpack.require('Obj');


//-------------------------------------------------------------------------------
// Declare Class
//-------------------------------------------------------------------------------

var SplitTestSession = Class.extend(Obj, {

    //-------------------------------------------------------------------------------
    // Constructor
    //-------------------------------------------------------------------------------

    _constructor: function(splitTestSessionObject) {

        //-------------------------------------------------------------------------------
        // Declare Variables
        //-------------------------------------------------------------------------------

        /**
         * @private
         * @type {string}
         */
        this.sessionUuid = splitTestSessionObject ? splitTestSessionObject.sessionUuid : null;

        /**
         * @private
         * @type {string}
         */
        this.testGroup = splitTestSessionObject ? splitTestSessionObject.testGroup : null;

        /**
         * @private
         * @type {string}
         */
        this.testName = splitTestSessionObject ? splitTestSessionObject.testName : null;

        /**
         * @private
         * @type {string}
         */
        this.userUuid = splitTestSessionObject ? splitTestSessionObject.userUuid : null;
    },


    //-------------------------------------------------------------------------------
    // Getters and Setters
    //-------------------------------------------------------------------------------

    /**
     * @return {string}
     */
    getSessionUuid: function() {
        return this.sessionUuid;
    },

    /**
     * @return {string}
     */
    getTestName: function() {
        return this.testName;
    },

    /**
     * @return {string}
     */
    getTestGroup: function() {
        return this.testGroup;
    },

    /**
     * @return {string}
     */
    getUserUuid: function() {
        return this.userUuid;
    },


    //-------------------------------------------------------------------------------
    // Class Methods
    //-------------------------------------------------------------------------------

    toObject: function() {
        return {
            sessionUuid: this.sessionUuid,
            testGroup: this.testGroup,
            testName: this.testName,
            userUuid: this.userUuid
        };
    }
});

//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

bugpack.export('splitbug.SplitTestSession', SplitTestSession);
