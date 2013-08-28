//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@TestFile

//@Require('Class')
//@Require('Obj')
//@Require('bugmeta.BugMeta')
//@Require('bugunit-annotate.TestAnnotation')
//@Require('sonarbugserver.SonarbugServer')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context();


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var Class               = bugpack.require('Class');
var Obj                 = bugpack.require('Obj');
var BugMeta             = bugpack.require('bugmeta.BugMeta');
var TestAnnotation      = bugpack.require('bugunit-annotate.TestAnnotation');
var SonarbugServer      = bugpack.require('sonarbugserver.SonarbugServer');


//-------------------------------------------------------------------------------
// Simplify References
//-------------------------------------------------------------------------------

var bugmeta             = BugMeta.context();
var test                = TestAnnotation.test;


//-------------------------------------------------------------------------------
// Declare Tests
//-------------------------------------------------------------------------------

var sonarbugServerStartTest = {

    async: true,

    // Setup Test
    //-------------------------------------------------------------------------------

    setup: function() {
        var _this = this;
        this.callOrder = [];
        this.sonarbugServer = new SonarbugServer();
        //TODO BRN: Need to come up with a spy/stub/mock library to make this easier.
        this.sonarbugServer.configure = function(callback) {
            _this.callOrder.push("configure");
            callback();
        };
        this.sonarbugServer.initialize = function(callback) {
            _this.callOrder.push("initialize");
            callback();
        };
    },


    // Run Test
    //-------------------------------------------------------------------------------

    test: function(test) {
        var _this = this;
        this.sonarbugServer.start(function() {
            test.assertEqual(_this.callOrder[0], "configure",
                "Assert that configure was called first.");
            test.assertEqual(_this.callOrder[1], "initialize",
                "Assert that initialize was called second.");
            test.complete();
        });
    }
};
bugmeta.annotate(sonarbugServerStartTest).with(
    test().name("SonarbugServer - start() Test")
);
