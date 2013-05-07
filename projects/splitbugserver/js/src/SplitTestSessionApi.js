//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Package('splitbug')

//@Export('SplitTestSessionApi')

//@Require('MathUtil')
//@Require('TypeUtil')
//@Require('UuidGenerator')
//@Require('bugflow.BugFlow')
//@Require('bugfs.BugFs')
//@Require('riak.RiakDb')
//@Require('splitbug.SplitTestApi')
//@Require('splitbug.SplitTestSession')
//@Require('splitbug.SplitTestUserApi')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context();
var path = require('path');


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var MathUtil =          bugpack.require('MathUtil');
var TypeUtil =          bugpack.require('TypeUtil');
var UuidGenerator =     bugpack.require('UuidGenerator');
var BugFlow =           bugpack.require('bugflow.BugFlow');
var BugFs =             bugpack.require('bugfs.BugFs');
var RiakDb =            bugpack.require('riak.RiakDb');
var SplitTestApi =      bugpack.require('splitbug.SplitTestApi');
var SplitTestSession =  bugpack.require('splitbug.SplitTestSession');
var SplitTestUserApi =  bugpack.require('splitbug.SplitTestUserApi');


//-------------------------------------------------------------------------------
// Simplify References
//-------------------------------------------------------------------------------

var $series =           BugFlow.$series;
var $task =             BugFlow.$task;


//-------------------------------------------------------------------------------
// Declare Class
//-------------------------------------------------------------------------------

var SplitTestSessionApi = {

    //-------------------------------------------------------------------------------
    // Static Methods
    //-------------------------------------------------------------------------------

    /**
     * @static
     * @param {string} userUuid
     * @param {function(Error, SplitTestSession)} callback
     */
    establishSplitTestSession: function(userUuid, callback) {
        if (!TypeUtil.isString(userUuid)) {
             callback(new Error("userUuid must be a string"));
        }
        var splitTestUser = null;
        var splitTestSession = null;
        var targetedSplitTest = null;
        $series([
            $task(function(flow) {
                SplitTestUserApi.getSplitTestUserByUuid(userUuid, function(error, _splitTestUser) {
                    if (!error) {
                        if (_splitTestUser) {
                            splitTestUser = _splitTestUser;
                            flow.complete();
                        } else {
                            flow.error(new Error("No SplitTestUser exists by the uuid of '" + userUuid + "'"));
                        }
                    } else {
                        flow.error(error);
                    }
                })
            }),
            $task(function(flow) {
                SplitTestApi.targetUserForSplitTest(splitTestUser, function(error, splitTest) {
                    if (!error) {
                        targetedSplitTest = splitTest;
                        flow.complete();
                    } else {
                        flow.error(error);
                    }
                });
            }),
            $task(function(flow) {

                splitTestSession = new SplitTestSession({
                    userUuid: userUuid,
                    sessionUuid: UuidGenerator.generateUuid(),
                    testName: targetedSplitTest.getName(),
                    testGroup: SplitTestApi.selectRandomTestGroup(targetedSplitTest)
                });
                //TODO BRN: Add some validation that this sessionUuid does not exist
                RiakDb.save('split-test-sessions', splitTestSession.getSessionUuid(), splitTestSession.toObject(), null, function(error) {
                    if (!error) {
                        callback(null, splitTestSession);
                    } else {
                        callback(error);
                    }
                });
            })
        ]).execute(function(error) {
            if (!error) {
                callback(null, splitTestSession);
            } else {
                callback(error);
            }
        });
    },

    /**
     * @static
     * @param {string} sessionUuid
     * @param {function(Error, SplitTestSession)} callback
     */
    getSplitTestSessionByUuid: function(sessionUuid, callback) {
        RiakDb.get('split-test-sessions', sessionUuid, function(error, splitTestSessionObject, meta) {

            //TEST
            console.log("get split test session by test name complete");
            console.log(error);
            console.log(splitTestSessionObject);
            console.log(meta);

            if (!error) {
                if (splitTestSessionObject) {
                    var splitTestSession = new SplitTestSession(splitTestSessionObject);
                    callback(null, splitTestSession);
                } else {
                    callback();
                }
            } else {
                callback(error);
            }
        });
    },

    /**
     * @static
     * @param {SplitTestSession} splitTestSession
     * @param {function(Error)} callback
     */
    saveSplitTestSession: function(splitTestSession, callback) {
        if (splitTestSession.getSessionUuid()) {
            RiakDb.save('split-test-sessions', splitTestSession.getSessionUuid(), splitTestSession.toObject(), null, callback);
        } else {
            callback(new Error("Cannot save split test session. Split test session must have a session uuid that " +
                "is not empty."));
        }
    },

    /**
     * @param {SplitTestSession} splitTestSession
     * @param {function(Error, boolean)} callback
     */
    validateSplitTestSession: function(splitTestSession, callback) {
        SplitTestApi.getSplitTestByName(splitTestSession.getTestName(), function(error, splitTest) {
            if (!error) {
                if (splitTest.getActive() === true) {
                    callback(null, true);
                } else {
                    callback(null, false);
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

bugpack.export('splitbug.SplitTestSessionApi', SplitTestSessionApi);
