//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@TestFile

//@Require('Class')
//@Require('Obj')
//@Require('annotate.Annotate')
//@Require('bugunit-annotate.TestAnnotation')
//@Require('sonarbug.LogsManager')


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
var LogsManager         = bugpack.require('sonarbug.LogsManager');


//-------------------------------------------------------------------------------
// Simplify References
//-------------------------------------------------------------------------------

var annotate = Annotate.annotate;
var test = TestAnnotation.test;


//-------------------------------------------------------------------------------
// Declare Tests
//-------------------------------------------------------------------------------

var updateLogEventManagersTest = {

    // Setup Test
    //-------------------------------------------------------------------------------

    setup: function() {
        var _this = this;
        this.callCount = 0;
        this.logsManager = new LogsManager();
        this.logsManager.moveCompletedFolderToToPackageFolderAndRemoveLogEventManager = function(folderName, callback){
            callback();
        };
        this.logsManager.logEventManagers = {
            "completed-1": {
                getMoveCount: function(){
                    _this.callCount++;
                    return this.moveCount
                },
                moveCount: 0,
                onceOn: function(eventName, callback){
                    callback();
                }
            },
            "completed-2": {
                getMoveCount: function(){
                    _this.callCount++;
                    return this.moveCount
                },
                moveCount: 3,
                onceOn: function(eventName, callback){
                    callback();
                }
            }
        };
        this.logsManager.packagedFolderPath = "packaged";
    },


    // Run Test
    //-------------------------------------------------------------------------------

    test: function(test) {
        console.log(this);
        this.logsManager.updateLogEventManagers(function(){});
        test.assertEqual(this.callCount, 2,
            "Assert that all of the logEventManagers have been called once.");
    }
};
annotate(updateLogEventManagersTest).with(
    test().name("LogsManager #updateLogEventManagers Test")
);
