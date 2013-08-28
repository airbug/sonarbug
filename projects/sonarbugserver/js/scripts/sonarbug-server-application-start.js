//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Require('sonarbugserver.sonarbugServerApplication')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context(module);


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var SonarbugServerApplication = bugpack.require('sonarbugserver.SonarbugServerApplication');


//-------------------------------------------------------------------------------
// Bootstrap
//-------------------------------------------------------------------------------

var sonarbugServerApplication = new SonarbugServerApplication();
sonarbugServerApplication.start(function(error){
    console.log("Starting sonarbug server...");
    if (!error){
        console.log("Sonarbug successfully started");
    } else {
        console.error(error);
        console.error(error.stack);
        process.exit(1);
    }
});
