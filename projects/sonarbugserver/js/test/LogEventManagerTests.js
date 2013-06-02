//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@TestFile

//@Require('Class')
//@Require('Obj')
//@Require('annotate.Annotate')
//@Require('bugunit-annotate.TestAnnotation')
//@Require('sonarbugserver.LogEventManager')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context();


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var Class               = bugpack.require('Class');
var Obj                 = bugpack.require('Obj');
var Annotate            = bugpack.require('annotate.Annotate');
var TestAnnotation      = bugpack.require('bugunit-annotate.TestAnnotation');
var LogEventManager     = bugpack.require('sonarbugserver.LogEventManager');


//-------------------------------------------------------------------------------
// Simplify References
//-------------------------------------------------------------------------------

var annotate = Annotate.annotate;
var test = TestAnnotation.test;


//-------------------------------------------------------------------------------
// Declare Tests
//-------------------------------------------------------------------------------

var getMoveCountTest = {

    // Setup Test
    //-------------------------------------------------------------------------------

    setup: function() {
        this.logEventManager = new LogEventManager("bar");
    },


    // Run Test
    //-------------------------------------------------------------------------------

    test: function(test) {

        var defaultCount    = this.logEventManager.getMoveCount();
        this.logEventManager.moveCount = 3;
        var count       = this.logEventManager.getMoveCount();

        test.assertEqual(defaultCount, 0,
            "Assert getMoveCount returns the correct default moveCount of 0");
        test.assertEqual(count, 3,
            "Assert getMoveCount returns the moveCount set to 3");
    }
};
annotate(getMoveCountTest).with(
    test().name("LogEventManager #getMoveCount Test")
);


var incrementMoveCountTest = {

    // Setup Test
    //-------------------------------------------------------------------------------

    setup: function() {
        this.logEventManager = new LogEventManager("foo");
    },


    // Run Test
    //-------------------------------------------------------------------------------

    test: function(test) {

        var countZero   = this.logEventManager.getMoveCount();
        this.logEventManager.incrementMoveCount();
        var countOne    = this.logEventManager.getMoveCount();
        this.logEventManager.incrementMoveCount();
        var countTwo    = this.logEventManager.getMoveCount();

        test.assertEqual(countZero, 0,
            "Assert the initial value of the moveCount property is 0");
        test.assertEqual(countOne, 1,
            "Assert the value of the moveCount after one incrementMoveCount is 1");
        test.assertEqual(countTwo, 2,
            "Assert the value of the moveCount after one incrementMoveCount is 2");
    }
};
annotate(incrementMoveCountTest).with(
    test().name("LogEventManager #incrementMoveCount Test")
);

var decrementMoveCountTest = {

    // Setup Test
    //-------------------------------------------------------------------------------

    setup: function() {
        this.logEventManager = new LogEventManager("bar");
    },


    // Run Test
    //-------------------------------------------------------------------------------

    test: function(test) {

        this.logEventManager.moveCount = 3;
        var countZero    = this.logEventManager.getMoveCount();
        this.logEventManager.decrementMoveCount();
        var countOne    = this.logEventManager.getMoveCount();
        this.logEventManager.decrementMoveCount();
        var countTwo    = this.logEventManager.getMoveCount();
        this.logEventManager.decrementMoveCount();
        var countThree  = this.logEventManager.getMoveCount();

        test.assertEqual(countZero, 3,
            "Assert the value of the moveCount property set to 3");
        test.assertEqual(countOne, 2,
            "Assert the value of the moveCount after one decrementMoveCount is 2");
        test.assertEqual(countTwo, 1,
            "Assert the value of the moveCount after two decrementMoveCount is 1");
        test.assertEqual(countThree, 0,
            "Assert the value of the moveCount after three decrementMoveCount is 0");
    }
};
annotate(decrementMoveCountTest).with(
    test().name("LogEventManager #decrementMoveCount Test")
);
