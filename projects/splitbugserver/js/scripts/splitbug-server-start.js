//-------------------------------------------------------------------------------
// Requires
//-------------------------------------------------------------------------------

//@Require('splitbug.SplitBug')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context(module);


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var SplitBugServer = bugpack.require('splitbug.SplitBugServer');


//-------------------------------------------------------------------------------
// Bootstrap
//-------------------------------------------------------------------------------

var splitBugServer = new SplitBugServer();
console.log("Configuring SplitBug server");
splitBugServer.configure(function(error) {
    if (!error) {
        console.log("SplitBug server successfully configured.");
        console.log("Starting SplitBug server");
        splitBugServer.start();
    } else {
        console.log("Error occurred while configuring SplitBug server.");
        console.log(error);
    }
});
