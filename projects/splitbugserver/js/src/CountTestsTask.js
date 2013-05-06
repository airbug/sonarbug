//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Package('splitbug')

//@Export('CountTestsTask')

//@Require('Class')
//@Require('Obj')
//@Require('bugflow.BugFlow')
//@Require('bugfs.BugFs')
//@Require('riak.RiakDb')
//@Require('splitbug.SplitTestApi')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context();
var path = require('path');


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var Class =         bugpack.require('Class');
var Obj =           bugpack.require('Obj');
var BugFlow =       bugpack.require('bugflow.BugFlow');
var BugFs =         bugpack.require('bugfs.BugFs');
var RiakDb =        bugpack.require('riak.RiakDb');
var SplitTestApi =  bugpack.require('splitbug.SplitTestApi');


//-------------------------------------------------------------------------------
// Simplify References
//-------------------------------------------------------------------------------

var $forInParallel =    BugFlow.$forInParallel;
var $series =           BugFlow.$series;
var $task =             BugFlow.$task;


//-------------------------------------------------------------------------------
// Declare Class
//-------------------------------------------------------------------------------

var CountTestsTask = Class.extend(Obj, {

    //-------------------------------------------------------------------------------
    // Constructor
    //-------------------------------------------------------------------------------

    _constructor: function() {

        this._super();


        //-------------------------------------------------------------------------------
        // Declare Variables
        //-------------------------------------------------------------------------------

        /**
         * @private
         * @type {Object}
         */
        this.config = {
            riakHost: "localhost",
            riakPort: "8098"
        };
    },


    //-------------------------------------------------------------------------------
    // Getters and Setters
    //-------------------------------------------------------------------------------



    //-------------------------------------------------------------------------------
    // Public Class Methods
    //-------------------------------------------------------------------------------

    /**
     *
     */
    configure: function(callback) {
        var _this = this;
        var configPath = path.resolve(__dirname, '../config.json');
        $series([
            $task(function(flow) {
                BugFs.exists(configPath, function(exists) {
                    if (exists) {
                        BugFs.readFile(configPath, 'utf8', function(error, data) {
                            if (!error) {
                                _this.config = JSON.parse(data);
                                flow.complete();
                            } else {
                                flow.error(error);
                            }
                        });
                    } else {
                        flow.complete();
                    }
                })
            }),
            $task(function(flow) {
                RiakDb.configure(_this.config);
                flow.complete();
            })
        ]).execute(callback);
    },

    /**
     *
     */
    run : function(callback) {
        var _this = this;
        var splitTestsMapObject = null;
        var weightsObject = null;
        $series([
            $task(function(flow) {
                _this.countAllSplitTestSessions(function(error, _splitTestsMapObject) {
                    if (!error) {
                        splitTestsMapObject = _splitTestsMapObject;
                        flow.complete();
                    } else {
                        flow.error(error);
                    }
                });
            }),
            $task(function(flow) {
                _this.calculateSplitTestWeights(splitTestsMapObject);
                flow.complete();
            }),
            $task(function(flow) {
                _this.updateSplitTests(splitTestsMapObject, function(error) {
                    flow.complete(error);
                })
            })
        ]).execute(callback);
    },


    //-------------------------------------------------------------------------------
    // Private Class Methods
    //-------------------------------------------------------------------------------

    /**
     * @private
     * @param {Object} splitTestsMapObject
     */
    calculateSplitTestWeights: function(splitTestsMapObject) {

        //TODO BRN: There's probably a way to perform this calculation within the map reduce

        var highestSessionCount = 0;
        for (var testName in splitTestsMapObject) {
            var splitTestObject = splitTestsMapObject[testName];
            if (splitTestObject.numberSessions > highestSessionCount) {
                highestSessionCount = splitTestObject.numberSessions;
            }
        }

        var maxWeight = 10;
        for (var testName in splitTestsMapObject) {
            var splitTestObject = splitTestsMapObject[testName];
            var ratio = splitTestObject.numberSessions / highestSessionCount;
            var deltaMax = maxWeight - (ratio * maxWeight);
            var ceilDelta = Math.ceil(deltaMax);
            var weight = Math.ceil((Math.pow(ceilDelta, 2) / 10));
            if (weight === 0) {
                weight = 1;
            }
            splitTestObject.weight = weight;
        }
    },

    /**
     * @private
     * @param {function(Error, Object)} callback
     */
    countAllSplitTestSessions: function(callback) {
        var mapReduce = RiakDb.mapReduce('split-test-sessions');
        mapReduce
            .map(function(riakObject) {
                var data = JSON.parse(riakObject.values[0].data);
                var splitTestsMapObject =  {};
                var splitTestObject = {
                    numberControlGroupSessions: 0,
                    numberSessions: 1,
                    numberTestGroupSessions: 0
                };
                if (data.testGroup === "control") {
                    splitTestObject.numberControlGroupSessions++;
                } else if (data.testGroup === "test") {
                    splitTestObject.numberTestGroupSessions++;
                }
                splitTestsMapObject[data.testName] = splitTestObject;
                return [splitTestsMapObject];
            })
            .reduce(function(splitTestsMapObjectsArray) {
                var reducedSplitTestsMapObject = {};
                for (var i in splitTestsMapObjectsArray) {
                    var splitTestsMapObject = splitTestsMapObjectsArray[i];
                    for (var testName in splitTestsMapObject) {
                        var splitTestObject = splitTestsMapObject[testName];
                        if (reducedSplitTestsMapObject[testName]) {
                            reducedSplitTestsMapObject[testName].numberControlGroupSessions += splitTestObject.numberControlGroupSessions;
                            reducedSplitTestsMapObject[testName].numberSessions += splitTestObject.numberSessions;
                            reducedSplitTestsMapObject[testName].numberTestGroupSessions += splitTestObject.numberTestGroupSessions;
                        } else {
                            reducedSplitTestsMapObject[testName] = splitTestObject;
                        }
                    }
                }
                return [reducedSplitTestsMapObject];
            })
            .run(function(error, results) {
                if (!error) {
                    console.log("Test session counts complete");
                    console.log(results);
                    callback(null, results[0]);
                } else {
                    callback(error);
                }
            });
    },

    /**
     * @private
     * @param {Object} splitTestsMapObject
     * @param {function(Error)} callback
     */
    updateSplitTests: function(splitTestsMapObject, callback) {
        $forInParallel(splitTestsMapObject, function(flow, testName, splitTestObject) {
            if (testName) {
                SplitTestApi.getSplitTestByName(testName, function(error, splitTest) {
                    if (!error) {
                        if (splitTest) {
                            splitTest.setNumberTestGroupSessions(splitTestObject.numberTestGroupSessions);
                            splitTest.setNumberControlGroupSessions(splitTestObject.numberControlGroupSessions);
                            splitTest.setNumberSessions(splitTestObject.numberSessions);
                            splitTest.setWeight(splitTestObject.weight);
                            SplitTestApi.saveSplitTest(splitTest, function(error) {
                                flow.complete(error);
                            });
                        } else {
                            flow.complete();
                        }
                    } else {
                        flow.complete(error);
                    }
                });
            } else {
                flow.complete();
            }
        }).execute(callback);
    }
});


//-------------------------------------------------------------------------------
// Exports
//-------------------------------------------------------------------------------

bugpack.export('splitbug.CountTestsTask', CountTestsTask);
