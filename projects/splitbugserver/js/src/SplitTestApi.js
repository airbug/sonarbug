//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Package('splitbug')

//@Export('SplitTestApi')

//@Require('List')
//@Require('Map')
//@Require('TypeUtil')
//@Require('UuidGenerator')
//@Require('WeightedRandomizer')
//@Require('bugboil.BugBoil')
//@Require('bugflow.BugFlow')
//@Require('bugfs.BugFs')
//@Require('riak.RiakDb')
//@Require('splitbug.SplitTest')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context();
var path = require('path');


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var List =                  bugpack.require('List');
var Map =                   bugpack.require('Map');
var TypeUtil =              bugpack.require('TypeUtil');
var UuidGenerator =         bugpack.require('UuidGenerator');
var WeightedRandomizer =    bugpack.require('WeightedRandomizer');
var BugBoil =               bugpack.require('bugboil.BugBoil');
var BugFlow =               bugpack.require('bugflow.BugFlow');
var BugFs =                 bugpack.require('bugfs.BugFs');
var RiakDb =                bugpack.require('riak.RiakDb');
var SplitTest =             bugpack.require('splitbug.SplitTest');


//-------------------------------------------------------------------------------
// Simplify References
//-------------------------------------------------------------------------------

var $foreachParallel =  BugBoil.$foreachParallel;
var $parallel =         BugFlow.$parallel;
var $series =           BugFlow.$series;
var $task =             BugFlow.$task;


//-------------------------------------------------------------------------------
// Declare Class
//-------------------------------------------------------------------------------

var SplitTestApi = {

    //-------------------------------------------------------------------------------
    // Static Variables
    //-------------------------------------------------------------------------------

    /**
     * @static
     * @private
     * @type {boolean}
     */
    configured: false,

    /**
     * @static
     * @private
     * @type {List.<SplitTest>}
     */
    splitTestList: null,


    //-------------------------------------------------------------------------------
    // Static Methods
    //-------------------------------------------------------------------------------

    /**
     * @static
     * @param callback
     */
    configure: function(callback) {
        if (!SplitTestApi.configured) {
            SplitTestApi.configured = true;
            $series([
                $task(function(flow) {
                    SplitTestApi.processSplitTestsFile(function(error) {
                        flow.complete(error);
                    });
                }),
                $task(function(flow) {
                    SplitTestApi.primeTargetingEngine(function(error) {
                        console.log("Targeting engine primed");
                        flow.complete(error);
                    })
                })
            ]).execute(callback)
        } else {
            callback();
        }
    },

    /**
     * @static
     * @param {string} name
     * @param {function(Error, SplitTest)} callback
     */
    getSplitTestByName: function(name, callback) {
        RiakDb.get('split-tests', name, function(error, splitTestObject, meta) {
            if (!error) {
                if (splitTestObject) {
                    var splitTest = new SplitTest(splitTestObject);
                    callback(null, splitTest);
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
     * @param {function(Error, Map.<string, SplitTest>)} callback
     */
    getMapOfAllActiveSplitTests: function(callback) {
        RiakDb.getAll('split-tests', function(error, splitTestObjects, meta) {
            //TEST
            console.log("Got all split tests");
            console.log(splitTestObjects);

            if (!error) {
                var splitTestsMap = new Map();
                if (splitTestObjects) {
                    splitTestObjects.forEach(function(splitTestObject) {
                        var splitTest = new SplitTest(splitTestObject);
                        if (splitTest.getActive()) {
                            splitTestsMap.put(splitTest.getName(), splitTest);
                        }
                    });
                }
                callback(null, splitTestsMap);
            } else {
                callback(error);
            }
        });
    },

    /**
     * @static
     * @param {function(Error, Array.<SplitTest>)} callback
     */
    getAllActiveSplitTests: function(callback) {
        RiakDb.getAll('split-tests', function(error, splitTestObjects, meta) {
            if (!error) {
                var splitTests = new List();
                if (splitTestObjects) {
                    splitTestObjects.forEach(function(splitTestObject) {
                        var splitTest = new SplitTest(splitTestObject);
                        if (splitTest.getActive()) {
                            splitTests.add(splitTest);
                        }
                    });
                }
                callback(null, splitTests);
            } else {
                callback(error);
            }
        });
    },

    /**
     * @param {function(Error)} callback
     */
    refresh: function(callback) {
        $series([
            $task(function(flow) {
                SplitTestApi.primeTargetingEngine(function(error) {

                    //TEST
                    console.log("Targeting engine primed");

                    flow.complete(error);
                })
            })
        ]).execute(callback)
    },

    /**
     * @static
     * @param {SplitTest} splitTest
     * @param {function(Error)} callback
     */
    saveSplitTest: function(splitTest, callback) {
        if (splitTest.getName()) {
            RiakDb.save('split-tests', splitTest.getName(), splitTest.toObject(), callback);
        } else {
            callback(new Error("Cannot save split test. Split test must have a name that is not empty."));
        }
    },

    /**
     * @static
     * @private
     * @param {SplitTest} splitTest
     * @return {string}
     */
    selectRandomTestGroup: function(splitTest) {
        var targetedTestGroup = "";
        var testGroupWeight = 1;
        var controlGroupWeight = 1;
        var weightedRandomizer = new WeightedRandomizer();
        if (splitTest.getNumberTestGroupSessions() < splitTest.getNumberControlGroupSessions()) {
            testGroupWeight = 2;
        } else {
            controlGroupWeight = 2;
        }
        weightedRandomizer.addValue("control", controlGroupWeight);
        weightedRandomizer.addValue("test", testGroupWeight);
        return weightedRandomizer.getRandom();
    },

    /**
     * @static
     * @param {SplitTestUser} splitTestUser
     * @param {function(Error, SplitTest)} callback
     */
    targetUserForSplitTest: function(splitTestUser, callback) {
        var weightedRandomizer = new WeightedRandomizer();

        //TEST
        console.log("Targeting user for split test");
        console.log("SplitTestApi.splitTestList.getCount():" + SplitTestApi.splitTestList.getCount());
        SplitTestApi.splitTestList.forEach(function(splitTest) {
            weightedRandomizer.addValue(splitTest, splitTest.getWeight());
        });
        var targetedSplitTest = weightedRandomizer.getRandom();
        //TEST
        console.log("Targeted user for split test - splitTest:" + JSON.stringify(targetedSplitTest.toObject));
        console.log(targetedSplitTest);

        callback(null, targetedSplitTest);
    },


    //-------------------------------------------------------------------------------
    // Private Static Methods
    //-------------------------------------------------------------------------------

    /**
     * @static
     * @private
     * @param {function(Error)} callback
     */
    processSplitTestsFile: function(callback) {
        var activeSplitTestsMap = null;
        var splitTestsObject = null;
        $series([
            $parallel([
                $task(function(flow) {
                    SplitTestApi.getMapOfAllActiveSplitTests(function(error, _activeSplitTestsMap) {
                        if (!error) {
                            activeSplitTestsMap = _activeSplitTestsMap;
                            flow.complete();
                        } else {
                            flow.error(error);
                        }
                    });
                }),
                $task(function(flow) {
                    var splitTestsPath = BugFs.path(path.resolve(__dirname, '../resources/split-tests.json'));
                    splitTestsPath.readFile('utf8', function(error, data) {
                        if (!error) {
                            splitTestsObject = JSON.parse(data);
                            flow.complete();
                        } else {
                            flow.error(error);
                        }
                    });
                })
            ]),
            $task(function(flow) {
                $foreachParallel(splitTestsObject.splitTests, function(boil, splitTestObject) {
                    if (splitTestObject.name) {
                        SplitTestApi.getSplitTestByName(splitTestObject.name, function(error, splitTest) {
                            if (!error) {
                                activeSplitTestsMap.remove(splitTest.getName());
                                var changed = false;
                                if (!splitTest) {
                                    splitTest = new SplitTest(splitTestObject);
                                    changed = true;
                                }

                                //NOTE BRN: We do not allow or WANT to set the weight and the counts here. That process
                                // is done by our map reduce jobs since that info is used for targeting.

                                if (splitTestObject.description !== splitTest.getDescription()) {
                                    splitTest.setDescription(splitTestObject.description);
                                    changed = true;
                                }
                                if (TypeUtil.isBoolean(splitTestObject.active)) {
                                    if (splitTestObject.active !== splitTest.getActive()) {
                                        splitTest.setActive(splitTestObject.active);
                                        changed = true;
                                    }
                                } else {
                                    if (splitTest.getActive() !== true) {
                                        splitTest.setActive(true);
                                        changed = true;
                                    }
                                }

                                if (changed) {

                                    //TEST
                                    console.log("Updating split test");
                                    console.log(JSON.stringify(splitTest.toObject()));

                                    SplitTestApi.saveSplitTest(splitTest, function(error) {
                                        boil.bubble(error);
                                    });
                                } else {
                                    boil.bubble();
                                }
                            } else {
                                boil.bubble(error);
                            }
                        });
                    } else {
                        boil.bubble(new Error("Error processing split test file. Split test must have a name. splitTest:" +
                            JSON.stringify(splitTestObject)));
                    }
                }).execute(function(error) {
                    flow.complete(error);
                });
            }),
            $task(function(flow) {
                var splitTestsToDeactivate = activeSplitTestsMap.getValueArray();

                //TEST
                console.log("About to deactivate these split tests");
                console.log(splitTestsToDeactivate);

                $foreachParallel(splitTestsToDeactivate, function(boil, splitTestToDeactivate) {

                    if (splitTestToDeactivate.getName()) {
                        splitTestToDeactivate.setActive(false);

                        //TEST
                        console.log("Deactivating split test");
                        console.log(JSON.stringify(splitTestToDeactivate.toObject()));

                        SplitTestApi.saveSplitTest(splitTestToDeactivate, function(error) {
                            boil.bubble(error);
                        });
                    } else {

                        //TEST
                        console.log("Trying to delete split test");
                        console.log(JSON.stringify(splitTestToDeactivate.toObject()));

                        RiakDb.remove('split-tests', "");
                    }
                }).execute(function(error) {
                    flow.complete(error);
                });
            })
        ]).execute(callback);
    },

    /**
     * @static
     * @private
     * @param {function(Error)} callback
     */
    primeTargetingEngine: function(callback) {
        console.log("Priming targeting engine");
        $series([
            $task(function(flow) {
                SplitTestApi.getAllActiveSplitTests(function(error, splitTestList) {
                    console.log("Split TESTS loaded");
                    console.log(splitTestList.getValueArray());
                    if (!error) {
                        SplitTestApi.splitTestList = splitTestList;
                        flow.complete();
                    } else {
                        flow.error(error);
                    }
                });
            })
        ]).execute(callback);
    }
};


//-------------------------------------------------------------------------------
// Exports
//-------------------------------------------------------------------------------

bugpack.export('splitbug.SplitTestApi', SplitTestApi);
