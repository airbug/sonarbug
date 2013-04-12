//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Package('splitbug')

//@Export('SplitTest')

//@Require('Class')
//@Require('Obj')
//@Require('TypeUtil')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context();


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var Class =     bugpack.require('Class');
var Obj =       bugpack.require('Obj');
var TypeUtil =  bugpack.require('TypeUtil');


//-------------------------------------------------------------------------------
// Declare Class
//-------------------------------------------------------------------------------

var SplitTest = Class.extend(Obj, {

    //-------------------------------------------------------------------------------
    // Constructor
    //-------------------------------------------------------------------------------

    _constructor: function(splitTestObject) {

        //-------------------------------------------------------------------------------
        // Declare Variables
        //-------------------------------------------------------------------------------

        /**
         * @private
         * @type {boolean}
         */
        this.active = false;

        /**
         * @private
         * @type {string}
         */
        this.description = "";

        /**
         * @private
         * @type {string}
         */
        this.name = "";

        /**
         * @private
         * @type {number}
         */
        this.numberSessions = 0;

        /**
         * @private
         * @type {number}
         */
        this.numberTestGroupSessions = 0;

        /**
         * @private
         * @type {number}
         */
        this.numberControlGroupSessions = 0;

        /**
         * @private
         * @type {number}
         */
        this.weight = 1;

        if (splitTestObject) {
            if (TypeUtil.isBoolean(splitTestObject.active)) {
                this.active = splitTestObject.active;
            }
            if (TypeUtil.isString(splitTestObject.description)) {
                this.description = splitTestObject.description;
            }
            if (TypeUtil.isString(splitTestObject.name)) {
                this.name = splitTestObject.name;
            }
            if (TypeUtil.isNumber(splitTestObject.numberSessions)) {
                this.numberSessions = splitTestObject.numberSessions;
            }
            if (TypeUtil.isNumber(splitTestObject.numberTestGroupSessions)) {
                this.numberTestGroupSessions = splitTestObject.numberTestGroupSessions;
            }
            if (TypeUtil.isNumber(splitTestObject.numberControlGroupSessions)) {
                this.numberControlGroupSessions = splitTestObject.numberControlGroupSessions;
            }
            if (TypeUtil.isNumber(splitTestObject.weight)) {
                this.weight = splitTestObject.weight;
            }
        }
    },


    //-------------------------------------------------------------------------------
    // Getters and Setters
    //-------------------------------------------------------------------------------

    /**
     * @return {boolean}
     */
    getActive: function() {
        return this.active;
    },

    /**
     * @param {boolean} active
     */
    setActive: function(active) {
        this.active = active;
    },

    /**
     * @return {string}
     */
    getDescription: function() {
        return this.description;
    },

    /**
     * @param {string} description
     */
    setDescription: function(description) {
        this.description = description;
    },

    /**
     * @return {string}
     */
    getName: function() {
        return this.name;
    },

    /**
     * @return {number}
     */
    getNumberControlGroupSessions: function() {
        return this.numberControlGroupSessions;
    },

    /**
     * @param {number} numberControlGroupSessions
     */
    setNumberControlGroupSessions: function(numberControlGroupSessions) {
        this.numberControlGroupSessions = numberControlGroupSessions;
    },

    /**
     * @return {number}
     */
    getNumberSessions: function() {
        return this.numberSessions;
    },

    /**
     * @param {number} numberSessions
     */
    setNumberSessions: function(numberSessions) {
        this.numberSessions = numberSessions;
    },

    /**
     * @return {number}
     */
    getNumberTestGroupSessions: function() {
        return this.numberTestGroupSessions;
    },

    /**
     * @param {number} numberTestGroupSessions
     */
    setNumberTestGroupSessions: function(numberTestGroupSessions) {
        this.numberTestGroupSessions = numberTestGroupSessions;
    },

    /**
     * @return {number}
     */
    getWeight: function() {
        return this.weight;
    },

    /**
     * @param {number} weight
     */
    setWeight: function(weight) {
        this.weight = weight;
    },


    //-------------------------------------------------------------------------------
    // Class Methods
    //-------------------------------------------------------------------------------

    toObject: function() {
        return {
            active: this.active,
            description: this.description,
            name: this.name,
            numberControlGroupSessions: this.numberControlGroupSessions,
            numberSessions: this.numberSessions,
            numberTestGroupSessions: this.numberTestGroupSessions,
            weight: this.weight
        };
    }
});

//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

bugpack.export('splitbug.SplitTest', SplitTest);
