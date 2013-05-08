//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Package('sonarbug')

//@Export('LogsManager')

//@Require('Class')
//@Require('Obj')
//@Require('bugflow.BugFlow')
//@Require('bugfs.Path')
//@Require('sonarbug.LogEventManager')
//@Require('sonarbug.PackageAndUploadManager')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack         = require('bugpack').context(module);
var fs              = require('fs');
var path            = require('path');


//-------------------------------------------------------------------------------
// BugPack Modules
//-------------------------------------------------------------------------------

var BugFlow                 = bugpack.require('bugflow.BugFlow');
var BugFs                   = bugpack.require('bugfs.BugFs');
var Class                   = bugpack.require('Class');
var LogEventManager         = bugpack.require('sonarbug.LogEventManager');
var Obj                     = bugpack.require('Obj');
var PackageAndUploadManager = bugpack.require('sonarbug.PackageAndUploadManager');


//-------------------------------------------------------------------------------
// Simplify References
//-------------------------------------------------------------------------------

var $forInParallel      = BugFlow.$forInParallel;
var $if                 = BugFlow.$if;
var $series             = BugFlow.$series;
var $parallel           = BugFlow.$parallel;
var $task               = BugFlow.$task;


//-------------------------------------------------------------------------------
// Declare Class
//-------------------------------------------------------------------------------

var LogsManager = Class.extend(Obj, {

    _constructor: function(){

        this._super();

        this.config                     = null;
        this.configFilePath             = null;
        this.logEventManagers           = null;
        this.activeFoldersPath          = null;
        this.completedFoldersPath       = null;
        this.logsPath                   = null;
        this.packagedFolderPath         = null;
        this.toPackageFoldersPath       = null;
        this.currentCompletedFolderName = null;
        this.currentCompletedFolderId   = null;
        this.currentCompletedFolderPath = null;
    },

    /**
     * @param {function()} callback
     */
    initialize: function(config, configFilePath, callback){
        console.log("initializing LogsManager...");
        var _this           = this;
        var callback        = callback || function(){};

        var config                      = this.config                   = config;
        var configFilePath              = this.configFilePath           = configFilePath;
        var logEventManagers            = this.logEventManagers         = {};
        var activeFoldersPath           = this.activeFoldersPath        = path.resolve(__dirname, '..', 'logs/', 'active/');
        var completedFoldersPath        = this.completedFoldersPath     = path.resolve(__dirname, '..', 'logs/', 'completed/');
        var logsPath                    = this.logsPath                 = path.resolve(__dirname, '..', 'logs/');
        var packagedFolderPath          = this.packagedFolderPath       = path.resolve(__dirname, '..', 'logs/', 'packaged/');
        var toPackageFoldersPath        = this.toPackageFoldersPath     = path.resolve(__dirname, '..', 'logs/', 'toPackage/');

        $series([
            $parallel([

                //-------------------------------------------------------------------------------
                // Initialize currentCompletedFolder variables
                //-------------------------------------------------------------------------------
                $task(function(flow){
                    _this.currentCompletedFolderId   = config.currentCompletedId;
                    _this.currentCompletedFolderName = 'completed-' + _this.currentCompletedFolderId;
                    _this.currentCompletedFolderPath = completedFoldersPath + '/' + _this.currentCompletedFolderName;
                    flow.complete();
                }),

                //-------------------------------------------------------------------------------
                // Create Folders
                //-------------------------------------------------------------------------------
                $task(function(flow){
                    fs.exists(logsPath, function(exists){
                        if(!exists){
                            fs.mkdir(logsPath, 0777, function(error){
                                flow.complete(error);
                            });
                        } else {
                            flow.complete();
                        }
                    });
                }),
                $task(function(flow){
                    fs.exists(toPackageFoldersPath, function(exists){
                        if(!exists){
                            fs.mkdir(toPackageFoldersPath, 0777, function(error){
                                flow.complete(error);
                            });
                        } else {
                            flow.complete();
                        }
                    });
                }),
                $task(function(flow){
                    fs.exists(completedFoldersPath, function(exists){
                        if(!exists){
                            fs.mkdir(completedFoldersPath, 0777, function(error){
                                flow.complete(error);
                            });
                        } else {
                            flow.complete();
                        }
                    });
                }),
                $task(function(flow){
                    fs.exists(activeFoldersPath, function(exists){
                        if(!exists){
                            fs.mkdir(activeFoldersPath, 0777, function(error){
                                flow.complete(error);
                            });
                        } else {
                            flow.complete();
                        }
                    });
                }),
                $task(function(flow){
                    fs.exists(packagedFolderPath, function(exists){
                        if(!exists){
                            fs.mkdir(packagedFolderPath, 0777, function(error){
                                flow.complete(error);
                            });
                        } else {
                            flow.complete();
                        }
                    });
                })
            ]),

            //-------------------------------------------------------------------------------
            // Move Directory Contents and Rotate Log Folders
            //-------------------------------------------------------------------------------
            $task(function(flow){
                console.log("Folders all created");
                
                BugFs.moveDirectoryContents(activeFoldersPath, _this.currentCompletedFolderPath, function(error){
                    flow.complete(error);
                });
            }),
            $task(function(flow){
                BugFs.moveDirectoryContents(completedFoldersPath, toPackageFoldersPath, function(error){
                    if(!error){
                        _this.rotateLogs(function(error){
                            flow.complete(error);
                        });
                    } else {
                        flow.error(error);
                    }
                });

            }),
            $task(function(flow){
                var packageAndUploadManager = new PackageAndUploadManager();
                packageAndUploadManager.initialize(function(error){
                    if(!error){
                        packageAndUploadManager.uploadEach(packagedFolderPath, function(error){
                            packageAndUploadManager = null;
                            if(!error){
                                console.log('Packaged log files uploaded and removed');
                                flow.complete();
                            } else{
                                flow.error(error);
                            }
                        });
                    } else {
                        flow.error(error);
                    }
                });
            })
        ]).execute(callback);
    },

    /**
     * @param {function(error)} callback
     */
    rotateLogs: function(callback){
        console.log("Rotating logs...");

        var _this                               = this;
        var config                              = this.config;
        var configFilePath                      = this.configFilePath;
        var completedFoldersPath                = _this.completedFoldersPath;
        var toPackageFoldersPath                = _this.toPackageFoldersPath;
        var oldCompletedFolderId                = _this.currentCompletedFolderId;
        var oldCompletedFolderName              = _this.currentCompletedFolderName;
        var oldCompletedFolderPath              = path.resolve(completedFoldersPath, oldCompletedFolderName);
        var newCompletedFolderName              = "completed-" + (oldCompletedFolderId + 1);
        var newCompletedFolderPath              = path.resolve(completedFoldersPath, newCompletedFolderName);
        var oldCompletedFolderLogEventManager   = _this.logEventManagers[oldCompletedFolderName];
        var newCompletedFolderLogEventManager;

        $series([
            $task(function(flow){
                _this.updateLogEventManagers(function(error){
                    flow.complete(error);
                });
            }),
            $task(function(flow){
                newCompletedFolderLogEventManager   = _this.logEventManagers[newCompletedFolderName] = new LogEventManager(newCompletedFolderName);
                
                flow.complete();
            }),
            $task(function(flow){
                console.log("newCompletedFolderPath:", newCompletedFolderPath);
                _this.createNewCompletedFolder(newCompletedFolderPath, function(error){
                    flow.complete(error);
                });
            }),
            $task(function(flow){
                _this.config.currentCompletedId ++;
                _this.currentCompletedFolderId      = _this.config.currentCompletedId;

                //TODO: SUNG How to make sure this doesn't interfere with other configs
                var newConfig                       = JSON.stringify(_this.config);

                console.log(_this);
                _this.updateConfigFile(configFilePath, newConfig, function(error){
                    if(!error){
                        console.log('Config file updated with new currentCompletedId:', _this.config.currentCompletedId);
                    }
                    flow.complete(error);
                });
            }),
            $task(function(flow){
                _this.rotateToNewCompletedFolder(newCompletedFolderName, newCompletedFolderPath, function(error){
                    flow.complete(error);
                });
            }),
            $task(function(flow){
                console.log("Logs rotated.");
                flow.complete();
            })
        ]).execute(callback);
    },

    appendToLogFile: function(logFilePath, data, callback){
        var callback = callback || function(){};
        if(logFilePath){
            //TODO BRN: Improve this to use BugFs so that we don't hit the open file handle maximum
            //TODO BRN: What happens which several writes against the open file happen at the same time?

            fs.appendFile(logFilePath, JSON.stringify(data) + '\n', function(error){
                callback(error);
            });
            console.log("tracklog:", "eventName:", data.eventName, "userID:", data.userID, "visitID:", data.visitID);
        } else {
            console.log('tracklog: Error: logFilePath is undefined');
            callback(new Error('logFilePath is undefined'));
        }
    },

    moveLogFileToCompletedUserFolder: function(logFilePath, currentCompletedFolderName, completedUserFolderPath, callback){
        var logEventManager = this.logEventManagers[currentCompletedFolderName];
        
        BugFs.move(logFilePath, completedUserFolderPath, function(error){
            if(!error){
                logEventManager.decrementMoveCount();
            }
            callback(error);
        });
    },


    //-------------------------------------------------------------------------------
    // Private Methods
    //-------------------------------------------------------------------------------

    /**
     * @private
     * @param {string} newCompletedFolderPath
     * @param {function(error)} callback
     */
    createNewCompletedFolder: function(newCompletedFolderPath, callback){
        fs.mkdir(newCompletedFolderPath, 0777, callback);
    },

    /**
     * @private
     * @param {string} newCompletedFolderName
     * @param {string} newCompletedFolderPath
     * @param {function(error)} callback
     */
    rotateToNewCompletedFolder: function(newCompletedFolderName, newCompletedFolderPath, callback){
        this.currentCompletedFolderName = newCompletedFolderName;
        this.currentCompletedFolderPath = newCompletedFolderPath;
        console.log("Completed Folder rotated to", newCompletedFolderName);
        callback();
    },

    /**
     * @private
     * @param {string} configFilePath
     * @type {{
     *  {
     *    "currentCompletedId":100,
     *    "logRotationInterval":60000, 
     *    "cronJobs": {
     *        "packageAndUpload": {
     *            "cronTime": '00 *\/10 * * * *', //seconds minutes hours day-of-month months days-of-week (00 *\/10 * * * * is every ten minutes )
     *            "start": false,
     *            "timeZone": "America/San_Francisco"
     *        }
     *    }
     * }
     * }}
     * @param {function(error)} callback
     */
    updateConfigFile: function(configFilePath, newConfig, callback){
        fs.writeFile(configFilePath, newConfig, callback);
    },

    /**
     * @private
     * @param {function(error)} callback
     */
    updateLogEventManagers: function(callback){
        var _this                   = this;
        var logEventManagers        = this.logEventManagers;
        var completedFoldersPath    = this.completedFoldersPath;

        $forInParallel(logEventManagers, function(flow, folderName, logEventManager){
            if(logEventManager.getMoveCount() === 0){
                var folderPath = path.resolve(_this.completedFoldersPath + '/' + folderName);
                _this.moveCompletedFolderToToPackageFolderAndRemoveLogEventManager(folderName, function(error){
                    flow.complete(error);
                });
            } else {
                logEventManager.onceOn("ready-to-package", function(event){
                    _this.moveCompletedFolderToToPackageFolderAndRemoveLogEventManager(folderName, function(error){
                        flow.complete(error);
                    });
                });
            }
        }).execute(callback);
    },

    /**
     * @private
     * @param {string} completedFolderName
     * @param {function(error)} callback
     */
    moveCompletedFolderToToPackageFolderAndRemoveLogEventManager: function(completedFolderName, callback){
        var _this = this;
        var completedFoldersPath    = this.completedFoldersPath;
        var toPackageFoldersPath    = this.toPackageFoldersPath;
        var completedFolderPath     = path.resolve(completedFoldersPath, completedFolderName);

        BugFs.moveDirectory(completedFolderPath, toPackageFoldersPath, function(error){
            if(!error){
                delete _this.logEventManagers[completedFolderName];
            } else {
                console.log(error);
            }
            callback(error);
        });
    }
});

//-------------------------------------------------------------------------------
// Exports
//-------------------------------------------------------------------------------

bugpack.export('sonarbug.LogsManager', LogsManager);