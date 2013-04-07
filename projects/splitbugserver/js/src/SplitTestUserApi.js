//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Package('splitbug')

//@Export('SplitTestUserApi')

//@Require('UuidGenerator')
//@Require('riak.RiakDb')
//@Require('splitbug.SplitTestUser')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context();


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var UuidGenerator = bugpack.require('UuidGenerator');
var RiakDb =        bugpack.require('riak.RiakDb');
var SplitTestUser = bugpack.require('splitbug.SplitTestUser');


//-------------------------------------------------------------------------------
// Declare Class
//-------------------------------------------------------------------------------

var SplitTestUserApi = {

    //-------------------------------------------------------------------------------
    // Static Methods
    //-------------------------------------------------------------------------------

    /**
     * @param {function(Error, SplitTestUser)} callback
     */
    generateSplitTestUser: function(callback) {
        var splitTestUser = new SplitTestUser({
            userUuid: UuidGenerator.generateUuid()
        });
        //TODO BRN: Add some validation that this userUuid does not exist
        RiakDb.save('split-test-users', splitTestUser.getUserUuid(), splitTestUser.toObject(), null, function(error) {
            if (!error) {
                callback(null, splitTestUser);
            } else {
                callback(error);
            }
        });
    },

    /**
     * @param {string} userUuid
     * @param {function(Error, SplitTestUser)} callback
     */
    getSplitTestUserByUuid: function(userUuid, callback) {
        RiakDb.get('split-test-users', userUuid, function(error, splitTestUserObject, meta) {

            //TEST
            console.log("get split test user complete");
            console.log(error);
            console.log(splitTestUserObject);
            console.log(meta);

            if (!error) {
                if (splitTestUserObject) {
                    var splitTestUser = new SplitTestUser(splitTestUserObject);
                    callback(null, splitTestUser);
                } else {
                    callback();
                }
            } else {
                callback(error);
            }
        });
    }
};


//-------------------------------------------------------------------------------
// Exports
//-------------------------------------------------------------------------------

bugpack.export('splitbug.SplitTestUserApi', SplitTestUserApi);
