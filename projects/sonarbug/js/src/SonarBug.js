//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Package('sonarbug')

//@Export('SonarBug')

//@Require('Class')
//@Require('Obj')
//@Require('EventDispatcher')
//@Require('sonarbug.PackageAndUploadManager')
//@Require('bugfs.Path')
//@Require('UuidGenerator')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack         = require('bugpack').context(module);
var child_process   = require('child_process');
var CronJob         = require('cron').CronJob;
var express         = require('express');
var fs              = require('fs');
var http            = require('http');
var io              = require('socket.io');
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
var UuidGenerator           = bugpack.require('UuidGenerator');


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

    //-------------------------------------------------------------------------------
    // Constructor
    //-------------------------------------------------------------------------------

    _constructor: function(){
        this._super();

        /**
         * @type {express()}
         */
        this.app                        = null;

        /**
         * @type {http.Server}
         */
        this.server                     = null;

        /**
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
         */
        this.config                     = null;

        /**
         * @type {{}}
         */
        this.logEventManagers           = null;

        /**
         * @type {{}}
         */
        this.cronJobs                   = null;

        /**
         * @type {string}
         */
        this.activeFoldersPath          = null;

        /**
         * @type {string}
         */
        this.completedFoldersPath       = null;

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
        this.logsPath                   = null;

        /**
         * @type {string}
         */
        this.packagedFolderPath         = null;

        /**
         * @type {string}
         */
        this.toPackageFoldersPath       = null;
    },

    /**
     * @param {function()} callback
     */
    initialize: function(callback){
        var _this           = this;
        var callback        = callback || function(){};
        var configFile      = path.resolve(__dirname, '..', 'sonarbug.config.json');
        var configDefault   = {"currentCompletedId":100,"logRotationInterval":3600000};

        if(fs.existsSync(configFile)){
            _this.config = JSON.parse(BugFs.readFileSync(configFile, 'utf-8'));
            console.log('sonarbug.config.json read in');
        } else {
            console.log("sonarbug.config.json could not be found");
            console.log("writing sonarbug.config.json file...");
            _this.config = configDefault;
            fs.writeFile(configFile, JSON.stringify(configDefault), function(){
                console.log("sonarbug.config.json written with defaults:", configDefault);
            });
        }

        this.logEventManagers           = {};
        this.cronJobs                   = {};
        this.activeFoldersPath          = path.resolve(__dirname, '..', 'logs/', 'active/');
        this.completedFoldersPath       = path.resolve(__dirname, '..', 'logs/', 'completed/');
        this.logsPath                   = path.resolve(__dirname, '..', 'logs/');
        this.packagedFolderPath         = path.resolve(__dirname, '..', 'logs/', 'packaged/');
        this.toPackageFoldersPath       = path.resolve(__dirname, '..', 'logs/', 'toPackage/');

        callback();
    },


    //-------------------------------------------------------------------------------
    // Static Public Methods
    //-------------------------------------------------------------------------------

    start: function(){
        var _this = this;
        var app;
        var server;
        console.log("Starting SonarBug...");

        $series([
            $task(function(flow){
                _this.initialize(function(error){
                    if(!error){
                        console.log("Sonarbug initialized");
                    } else {
                        console.log("Sonarbug failed to initialize");
                    }
                    flow.complete(error);
                })
            }),
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
            $parallel([
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
                    flow.complete();
                }),
                $task(function(flow){
                    _this.initializePackageAndUploadCronJob(function(){
                        console.log('packageAndUploadCronJob initialized');
                        _this.startPackageAndUploadCronJob(function(){
                            flow.complete();
                        });
                    });
                })
            ])
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
            app.use(function (req, res, next) {
                res.removeHeader("X-Powered-By");
                next();
            });
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

        app.all('/socket-api/*', function(req, res, next){
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "X-Requested-With");
            res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
            res.header("Access-Control-Allow-Headers", "Content-Type");
            next();
        });

        callback();
    },


    /**
     * @param {http.Server} server
     */
    enableSockets: function(server){
        var _this               = this;
        var activeFoldersPath   = this.activeFoldersPath;
        var ioManager           = io.listen(server); //Global namespace

        ioManager.set('match origin protocol', true); //NOTE: Only necessary for use with wss, WebSocket Secure protocol
        ioManager.set('resource', '/socket-api'); //NOTE: forward slash is required here unlike client setting
        ioManager
        .of('/socket-api') // @return local namespace manager
        .on('connection', function (socket) {
            console.log("Connection established")
            var userID = UuidGenerator.generateUuid();
            var visitID = UuidGenerator.generateUuid();
            var logFileName = userID + '-' + visitID + '.log';
            var logFilePath = activeFoldersPath + '/' + logFileName;
            socket.on('tracklog', function(data){
                data.userID = userID;
                data.visitID = visitID;

                if(logFilePath){
                    fs.appendFile(logFilePath, JSON.stringify(data) + '\n', function(){});
                    console.log("tracklog:", "eventName:", data.eventName, "userID:", userID, "visitID:", visitID);
                } else {
                    console.log('tracklog: Error: logFilePath is undefined');
                }
            });

            socket.on('disconnect', function(){
                var currentCompletedFolderName = _this.currentCompletedFolderName;
                var logEventManager = _this.logEventManagers[currentCompletedFolderName];
                logEventManager.incrementMoveCount();

                var completedUserFolderPath = _this.completedFoldersPath + '/' + currentCompletedFolderName + '/' + userID + '/';
                var data = {
                    eventName: 'disconnect',
                    userID: userID,
                    visitID: visitID,
                    timestamp: new Date(),
                    data: null
                };

                if(logFilePath){
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
                } else {
                    console.log('disconnect: Error: logFilePath is undefined');
                }
            });

            socket.on('error', function(reason){
                console.log('Error:', reason, "userID:", userID, "visitID:", visitID);
            });
        });
    },

    //-------------------------------------------------------------------------------
    // Logs
    //-------------------------------------------------------------------------------

    /**
     * @param {function(error)} callback
     */
    initializeLogs: function(callback){
        var _this                   = this;
        var config                  = this.config;
        var logsPath                = this.logsPath;
        var activeFoldersPath       = this.activeFoldersPath;
        var completedFoldersPath    = this.completedFoldersPath;
        var packagedFolderPath      = this.packagedFolderPath;
        var toPackageFoldersPath    = this.toPackageFoldersPath;

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
                BugFs.moveDirectoryContents(activeFoldersPath, _this.currentCompletedFolderPath, function(error){
                    flow.complete(error);
                });
            }),
            $task(function(flow){
                var packageAndUploadManager = new PackageAndUploadManager();
                packageAndUploadManager.initialize(function(error){
                    if(!error){
                        packageAndUploadManager.uploadEach(_this.packagedFolderPath, function(error){
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
                            delete _this.logEventManagers[oldCompletedFolderName];
                        } else {
                            console.log(error);
                        }
                    });
                } else {
                    oldCompletedFolderLogEventManager.onceOn("ready-to-package", function(){
                        BugFs.moveDirectory(oldCompletedFolderPath, toPackageFoldersPath, function(error){
                            if(!error){
                                delete _this.logEventManagers[oldCompletedFolderName];
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

    /**
     * @param {number} interval
     */
    setLogRotationInterval: function(interval){
        this.config.logRotationInterval = interval;
        console.log('Log rotation interval set to', interval);
    },


    //-------------------------------------------------------------------------------
    // CronJobs: PackageAndUpload
    //-------------------------------------------------------------------------------

    /**
     * @param {function()=} callback
     */
    initializePackageAndUploadCronJob: function(callback){
        var callback = callback || function(){};
        var configOverrides = null;
        var config = {
            cronTime: '00 15 */1 * * *',
            start: false,
            timeZone: "America/Los_Angeles"
            // , context:
            // , onComplete: function(){}
        };

        if (this.config.cronJobs) {
            configOverrides = this.config.cronJobs.packageAndUpload;
        }

        if(configOverrides){
            for(var prop in configOverrides){
                config[prop] = configOverrides[prop];
            }
        }

        console.log('packageAndUploadCronJob settings:', config);

        config.onTick = function(){
            var options = {
                cwd: path.resolve(__dirname, '..', 'scripts/')
            };
            child_process.exec('node packageandupload.js', options, function(error, stdout, stderr){
                console.log('stdout: ', stdout);
                console.log('stderr: ', stderr);
                if (error) {
                  console.log('exec error: ', error);
                }
            });
        };
        var job = new CronJob(config);
        this.cronJobs.packageAndUpload = job;

        callback();
    },

    /**
     * @param {function()=} callback
     */
    startPackageAndUploadCronJob: function(callback){
        var callback = callback || function(){};
        var job = this.cronJobs.packageAndUpload;
        if(job){
            job.start();
            console.log("packageAndUploadCronJob started");
        } else {
            console.log("packageAndUploadCronJob does not exist \n Please initialize cron job first");
        }

        callback();
    },

    /**
     * @param {function()=} callback
     */
    stopPackageAndUploadCronJob: function(callback){
        var callback = callback || function(){};
        var job = this.cronJobs.packageAndUpload;
        if(job){
            if(job.running){
                job.stop();
                console.log("packageAndUploadCronJob stopped");
            } else {
                console.log("packageAndUploadCronJob is not running");
            }
        } else {
            console.log("packageAndUploadCronJob does not exist \n Please configure cron job first");
        }

        callback();
    }
});


//-------------------------------------------------------------------------------
// Exports
//-------------------------------------------------------------------------------

bugpack.export('sonarbug.SonarBug', SonarBug);
