//-------------------------------------------------------------------------------
// Requires
//-------------------------------------------------------------------------------

//@Package('sonarbug')

//@Export('SonarBug')

//@Require('bugflow.BugFlow')
//@Require('bugfs.BugFs')
//@Require('Class')
//@Require('Obj')
//@Require('EventDispatcher')
//@Require('bugfs.Path');

//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack     = require('bugpack').context(module);
var fs          = require('fs');
var http        = require('http');
var path        = require('path');
var io          = require('socket.io');
var express     = require('express');

//-------------------------------------------------------------------------------
// BugPack Modules
//-------------------------------------------------------------------------------

var AwsConfig       = bugpack.require('aws.AwsConfig');
var BugFlow         = bugpack.require('bugflow.BugFlow');
var BugFs           = bugpack.require('bugfs.BugFs');
var Class           = bugpack.require('Class');
var LogEventManager = bugpack.require('sonarbug.LogEventManager');
var Obj             = bugpack.require('Obj');
var Path            = bugpack.require('bugfs.Path');
var S3Api           = bugpack.require('aws.S3Api');
var S3Bucket        = bugpack.require('aws.S3Bucket');

//-------------------------------------------------------------------------------
// Simplify References
//-------------------------------------------------------------------------------

var $if                 = BugFlow.$if;
var $series             = BugFlow.$series;
var $parallel           = BugFlow.$parallel;
var $task               = BugFlow.$task;

//-------------------------------------------------------------------------------
// Declare Class
//-------------------------------------------------------------------------------

var SonarBug = Class.extend(Obj, {
    _constructor: function(){
        this._super();

        /**
         * @type {express()}
         */
        this.app = null;

        /**
         * @type {http.Server}
         */
        this.server = null;

        /**
         * @type {{
         *  currentCompletedId: number
         * }}
         */
        this.config = JSON.parse(BugFs.readFileSync(path.resolve(__dirname, '..', 'sonarbug.config.json'), 'utf-8'));

        /**
         * @type {{}}
         */
        this.logEventManagers = {};

        /**
         * @type {string}
         */
        this.activeFoldersPath          = path.resolve(__dirname, '..', 'logs/', 'active/');

        /**
         * @type {string}
         */
        this.completedFoldersPath       = path.resolve(__dirname, '..', 'logs/', 'completed/');

        /**
         * @type {number}
         */
        this.currentCompletedFolderId   = null;

        /**
         * @type {string}
         */
        this.currentCompletedFolderName = null;

        /**
         * @type {string}
         */
        this.currentCompletedFolderPath = null;

        /**
         * @type {string}
         */
        this.logsPath                   = path.resolve(__dirname, '..', 'logs/');

        /**
         * @type {string}
         */
        this.packagedFolderPath         = path.resolve(__dirname, '..', 'logs/', 'packaged/');

        /**
         * @type {string}
         */
        this.toPackageFoldersPath       = path.resolve(__dirname, '..', 'logs/', 'toPackage/');
    },

    start: function(){
        var _this = this;
        var app;
        var server;
        console.log("Starting SonarBug...");

        $series([
            $task(function(flow){
                _this.initializeLogs(function(error){
                    if(!error){
                        console.log('Log folders initialized and updated');
                        flow.complete();
                    } else {
                        console.log(error);
                        flow.complete();
                    }
                });
            }),
            $task(function(flow){
                // Create Server
                app = _this.app = express();
                server = _this.server = http.createServer(app);

                _this.configure(app, express, function(){
                    console.log("SonarBug configured");
                });

                _this.enableSockets(server, function(){
                    console.log("SonarBug sockets enabled");
                });

                server.listen(app.get('port'), function(){
                    console.log("SonarBug listening on port", app.get('port'));
                });

                flow.complete();

            }),
            // Set interval for log rotations
            $task(function(flow){
                var config = _this.config;
                setInterval(function(){
                    _this.rotateLogs();
                }, config.logRotationInterval);
            })
        ]).execute(function(error){
            if(!error){
                console.log("SonarBug successfully started");
            } else {
                console.error(error);
                console.error(error.stack);
                process.exit(1);
            }
        });
    },

    /**
     * @param {express()} app
     * @param {express} express
     * @param {function()} callback
     */
    configure: function(app, express, callback){
        app.configure(function(){
            app.set('port', process.env.PORT || 3000);
            // app.use(express.favicon());
            app.use(express.logger('dev'));
            // app.use(express.bodyParser());
            // app.use(express.methodOverride());
            app.use(app.router);
            // app.use(express.static(path.join(__dirname, 'public')));
        });

        app.configure('development', function(){
            app.use(express.errorHandler());
        });

        callback();
    },


    /**
     * @param {http.Server} server
     */
    enableSockets: function(server){
        var _this = this;
        var activeFoldersPath = this.activeFoldersPath;
        var ioManager = io.listen(server);

        ioManager.sockets.on('connection', function (socket) {
            console.log("Connection established")
            var userID;
            var visitID;
            var logFileDirectory;
            var logFileName;
            var logFilePath;

            socket.on('startTracking', function(data){
                userID = data.userID;
                visitID = data.visitID;
                logFileName = userID + '-' + visitID + '.log';
                logFilePath = activeFoldersPath + '/' + logFileName;

                fs.appendFile(logFilePath, JSON.stringify(data) + '\n', function(){});
                console.log("startTracking:", "userID:", userID, "visitID:", visitID);
                socket.removeAllListeners('startTracking');
            })

            socket.on('tracklog', function(data){
                fs.appendFile(logFilePath, JSON.stringify(data) + '\n', function(){});
                console.log("tracklog:", "userID:", userID, "visitID:", visitID);
            });

            socket.on('disconnect', function(){
                var currentCompletedFolderName = _this.currentCompletedFolderName;
                var logEventManager = _this.logEventManagers[currentCompletedFolderName];
                logEventManager.incrementMoveCount()

                var completedUserFolderPath = _this.completedFoldersPath + '/' + currentCompletedFolderName + '/' + userID + '/';
                var data = {
                    eventName: 'disconnect',
                    userID: userID,
                    visitID: visitID,
                    data: {
                        timestamp: new Date()
                    }
                };

                console.log("disconnect:", "userID:", userID, "visitID:", visitID);

                fs.appendFile(logFilePath, JSON.stringify(data) + '\n', function(error){
                    fs.exists(completedUserFolderPath, function(exists){
                        if(!exists){
                            fs.mkdir(completedUserFolderPath, 0777, function(error){
                                BugFs.move(logFilePath, completedUserFolderPath, function(error){
                                    if(!error){
                                        logEventManager.decrementMoveCount();
                                    } else {
                                        console.log(error);
                                    }
                                });
                            });
                        } else {
                            BugFs.move(logFilePath, completedUserFolderPath, function(error){
                                if(!error){
                                    logEventManager.decrementMoveCount();
                                } else {
                                    console.log(error);
                                }
                            });
                        }
                    });
                });
            });

            socket.on('error', function(reason){
                console.log('Error:', reason, "userID:", userID, "visitID:", visitID);
            });
        });
    },

    //-------------------------------------------------------------------------------
    //
    //-------------------------------------------------------------------------------

    /**
     * @param {function(error)} callback
     */
    initializeLogs: function(callback){
        var _this                   = this;
        var config                  = this.config;
        var logsPath                = this.logsPath;
        var toPackageFoldersPath    = this.toPackageFoldersPath;
        var completedFoldersPath    = this.completedFoldersPath;
        var activeFoldersPath       = this.activeFoldersPath;

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
                })
            ]),

            //-------------------------------------------------------------------------------
            // Move Directory Contents and Rotate Log Folders
            //-------------------------------------------------------------------------------
            $task(function(flow){
                BugFs.moveDirectoryContents(activeFoldersPath, _this.currentCompletedFolderPath, function(error){
                    flow.complete(error);
                });
            }),
            $task(function(flow){
                BugFs.moveDirectoryContents(completedFoldersPath, toPackageFoldersPath, function(error){
                    if(error){
                        flow.complete(error); // error or complete?
                    } else {
                        _this.rotateLogs(function(error){
                            flow.complete(error);
                        });
                    }
                });

            })
        ]).execute(callback);
    },

    /**
     * @param {function(error)} callback
     */
    rotateLogs: function(callback){
        var _this                               = this;
        var config                              = this.config;
        var completedFoldersPath                = this.completedFoldersPath;
        var toPackageFoldersPath                = this.toPackageFoldersPath;
        var oldCompletedFolderId                = this.currentCompletedFolderId = config.currentCompletedId || 0;
        var oldCompletedFolderName              = this.currentCompletedFolderName;
        var oldCompletedFolderPath              = path.resolve(completedFoldersPath, oldCompletedFolderName);
        var newCompletedFolderName              = "completed-" + (oldCompletedFolderId + 1);
        var newCompletedFolderPath              = path.resolve(completedFoldersPath, newCompletedFolderName);
        var oldCompletedFolderLogEventManager   = this.logEventManagers[oldCompletedFolderName];
        var newCompletedFolderLogEventManager   = this.logEventManagers[newCompletedFolderName] = new LogEventManager(newCompletedFolderName);

        config.currentCompletedId ++;
        // Make the new completedFolder
        fs.mkdir(newCompletedFolderPath, 0777, function(error){
            // Update the config file
            fs.writeFile(path.resolve(__dirname, '..', 'sonarbug.config.json'), JSON.stringify(config), function(error){
                console.log('Config file updated with new currentCompletedId');
                // rotate currentCompletedFolder
                _this.currentCompletedFolderName = newCompletedFolderName;
                _this.currentCompletedFolderPath = newCompletedFolderPath;
                console.log("Completed Folder rotated to", newCompletedFolderName);

                // Move oldCompletedFolder to toPackageFolders folder OR add a listener
                if (!oldCompletedFolderLogEventManager){
                    //Do nothing
                } else if (oldCompletedFolderLogEventManager.getMoveCount() === 0){
                    BugFs.moveDirectory(oldCompletedFolderPath, toPackageFoldersPath, function(error){
                        if(!error){
                            // oldCompletedFolderLogEventManager = null;
                            // notify packAndUpload
                        } else {
                            console.log(error);
                            // oldCompletedFolderLogEventManager = null;
                            // notify packAndUpload
                        }
                    });
                } else {
                    oldCompletedFolderLogEventManager.onceOn("ready-to-package", function(){
                        BugFs.moveDirectory(oldCompletedFolderPath, toPackageFoldersPath, function(error){
                            if(!error){
                                // oldCompletedFolderLogEventManager = null;
                                // notify packAndUpload
                            } else {
                                console.log(error);
                            }
                        });
                    });
                }

                if(callback){
                    callback();
                }
            });
        });
    },

    setLogRotationInterval: function(interval){
        this.config.logRotationInterval = interval;
    }
});

//-------------------------------------------------------------------------------
// Exports
//-------------------------------------------------------------------------------

bugpack.export('sonarbug.SonarBug', SonarBug);