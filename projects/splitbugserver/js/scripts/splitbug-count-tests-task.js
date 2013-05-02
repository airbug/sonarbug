//-------------------------------------------------------------------------------
// Requires
//-------------------------------------------------------------------------------

//@Require('splitbug.CountTestsTask')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context(module);


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var CountTestsTask = bugpack.require('splitbug.CountTestsTask');


//-------------------------------------------------------------------------------
// Bootstrap
//-------------------------------------------------------------------------------

var countTestsTask = new CountTestsTask();
console.log("Configuring SplitBug count tests task");
countTestsTask.configure(function(error) {
    if (!error) {
        console.log("Running SplitBug count tests task");
        countTestsTask.run(function(error) {
            if (!error) {

                // TODO BRN: Send a message via pubsubbug to the splitbug server and have it dump the riakdb cache and reprime the targeting engine
                // TODO BRN: Create an underlying communication mechanism for how these types of tasks are completed that deploybug will be able to access.

            } else {
                console.error("An error occurred while running the count tests task");
                console.error(error);
                console.error(error.message);
                console.error(error.stack);
                process.exit(1);
                return;
            }
        });
    } else {
        console.error("An error occurred while configuring the count tests task");
        console.error(error);
        console.error(error.stack);
        process.exit(1);
        return;
    }
});
