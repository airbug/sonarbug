//-------------------------------------------------------------------------------
// Requires
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
// 
//-------------------------------------------------------------------------------

var packageAndUploadManager = new PackageAndUploadManager();
var packageAndUploadJob = new cronJob({
    cronTime: '00 */5 * * * *', //seconds minutes hours day-of-month months days-of-week
    onTick: function() {
        packageAndUploadManager.packageAndUploadEach(function(error){
            if(!error){
                console.log('Package and Upload Task Completed');
            } else {
                console.log(error);
            }
        });
    },
    start: false,
    timeZone: "America/San_Francisco"
    // ,context: // defaults to the cronjob itself
    // ,onComplete: function(){}
});

packageAndUploadJob.start();