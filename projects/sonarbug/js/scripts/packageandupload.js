//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Require('sonarbug.PackageAndUploadManager')

//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context(module);
var cronJob = require('cron').CronJob;

//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var PackageAndUploadManager = bugpack.require('sonarbug.PackageAndUploadManager');

//-------------------------------------------------------------------------------
// Script Body
//-------------------------------------------------------------------------------

var packageAndUploadManager = new PackageAndUploadManager();

console.log('Executing packageandupload script');

packageAndUploadManager.initialize(function(error){
    if(!error){
        console.log('packageAndUploadManager initialized');
        packageAndUploadManager.packageAndUploadEach(function(error){
            if(!error){
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
