//-------------------------------------------------------------------------------
// Requires
//-------------------------------------------------------------------------------

//@Require('sonarbug.PackageAndUploadManager')

//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context(module);

//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var PackageAndUploadManager = bugpack.require('sonarbug.PackageAndUploadManager');

//-------------------------------------------------------------------------------
// 
//-------------------------------------------------------------------------------

var packageAndUploadManager = new PackageAndUploadManager();
packageAndUploadManager.packageAndUploadEach(function(error){
    if(!error){
        console.log('Package and Upload Task Completed');
    } else {
        console.log(error);
    }
});


// This script should be run with node
// Running with Forever will cause this script to continuously restart