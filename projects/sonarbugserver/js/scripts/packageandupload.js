//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Require('sonarbugserver.PackageAndUploadManager')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context(module);


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var PackageAndUploadManager = bugpack.require('sonarbugserver.PackageAndUploadManager');


//-------------------------------------------------------------------------------
// Script Body
//-------------------------------------------------------------------------------

var packageAndUploadManager = new PackageAndUploadManager();

console.log('Executing packageandupload script');

packageAndUploadManager.initialize(function(error){
    if (!error) {
        console.log('packageAndUploadManager initialized');
        packageAndUploadManager.packageAndUploadEach(function(error) {
            packageAndUploadManager = null;
            if (!error) {
                console.log('Package and Upload Task Completed');
            } else {
                console.log('Package and Upload Task Failed');
                console.log(error);
            }
        });
    } else {
        console.log('packageAndUploadManager failed to initialize');
        console.log(error);
    }
});
