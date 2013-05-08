//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Package('sonarbug')

//@Export('SonarBug')

//@Require('Class')
//@Require('Obj')
//@Require('EventDispatcher')
//@Require('sonarbug.PackageAndUploadManager')
//@Require('sonarbug.LogsManager')
//@Require('bugflow.BugFlow')
//@Require('bugfs.BugFs')
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
var LogsManager             = bugpack.require('sonarbug.LogsManager');
var Obj                     = bugpack.require('Obj');
var PackageAndUploadManager = bugpack.require('sonarbug.PackageAndUploadManager');
var UuidGenerator           = bugpack.require('UuidGenerator');


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
        
        this.configFilePath             = null;

        /**
         * @type {{}}
         */
        this.cronJobs                   = null;

        /**
         * @type {LogsManager}
         */
        this.logsManager                = null;

        /**
         * @type {http.Server}
         */
        this.server                     = null;

    },

    /**
     * @param {function()} callback
     */
    initialize: function(callback){
        var _this           = this;
        var callback        = callback || function(){};
        var configFile      = path.resolve(__dirname, '..', 'sonarbug.config.json');
        var configDefault   = {
            "currentCompletedId":1,
            "logRotationInterval":3600000, 
            "cronJobs": {
                "packageAndUpload": {
                    "cronTime": "00 15 */1 * * *",
                    "start": false,
                    "timeZone": "America/Los_Angeles"
                }
            }
        };

        this.logsManager                = new LogsManager();
        this.logEventManagers           = this.logsManager.logEventManagers;
        this.cronJobs                   = {};
        this.configFilePath             = configFile;

        fs.exists(configFile, function(exists){
            if(exists){
                _this.config = JSON.parse(BugFs.readFileSync(configFile, 'utf-8'));
                console.log('sonarbug.config.json read in');
                callback();
            } else {
                console.log("sonarbug.config.json could not be found");
                console.log("writing sonarbug.config.json file...");
                _this.config = configDefault;
                fs.writeFile(configFile, JSON.stringify(configDefault), function(error){
                    console.log("sonarbug.config.json written with defaults:", configDefault);
                    callback(error);
                });
            }
        });
    },


    //-------------------------------------------------------------------------------
    // Static Public Methods
    //-------------------------------------------------------------------------------

    start: function(){
        var _this           = this;
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
                _this.logsManager.initialize(_this.config, _this.configFilePath, function(error){
                    if(!error){
                        console.log('Log folders initialized and updated');
                        console.log(_this.logsManager);
                        flow.complete();
                    } else {
                        console.log(error);
                        console.log(_this.logsManager);
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
                        _this.logsManager.rotateLogs();
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

        callback();
    },


    /**
     * @param {http.Server} server
     */
    enableSockets: function(server){
        var _this                   = this;
        var activeFoldersPath       = this.logsManager.activeFoldersPath;
        var completedFoldersPath    = this.logsManager.completedFoldersPath;
        var ioManager               = io.listen(server); //NOTE: Global namespace
        
        ioManager.set('transports', [
            'websocket',
            'flashsocket',
            'htmlfile',
            'xhr-polling',
            'jsonp-polling'
        ]);
        ioManager.set('match origin protocol', true); //NOTE: Only necessary for use with wss, WebSocket Secure protocol
        ioManager.set('resource', '/socket-api'); //NOTE: forward slash is required here unlike client setting

        var socketApiManager = ioManager.of('/socket-api'); //NOTE: @return local namespace manager
        socketApiManager.on('connection', function (socket) {
            console.log("Connection established")
            var userID = UuidGenerator.generateUuid();
            var visitID = UuidGenerator.generateUuid();
            var logFileName = userID + '-' + visitID + '.log';
            var logFilePath = activeFoldersPath + '/' + logFileName;

            socket.on('tracklog', function(data){
                data.userID = userID;
                data.visitID = visitID;
                _this.logsManager.appendToLogFile(logFilePath, data, function(error){
                    
                });
            });

            socket.on('disconnect', function(){
                var logsManager                 = _this.logsManager;
                var currentCompletedFolderName  = _this.logsManager.currentCompletedFolderName; //BUGBUG
                var logEventManager             = _this.logsManager.logEventManagers[currentCompletedFolderName];

                logEventManager.incrementMoveCount(); //Why is logEventManager undefined? it doesn't exist

                var completedUserFolderPath = completedFoldersPath + '/' + currentCompletedFolderName + '/' + userID + '/';
                var data = {
                    eventName: 'disconnect',
                    userID: userID,
                    visitID: visitID,
                    timestamp: new Date(),
                    data: null
                };


                logsManager.appendToLogFile(logFilePath, data, function(error){
                    if(!error){
                        fs.exists(completedUserFolderPath, function(exists){
                            if(!exists){
                                fs.mkdir(completedUserFolderPath, 0777, function(error){
                                    if(!error){
                                        logsManager.moveLogFileToCompletedUserFolder(logFilePath, currentCompletedFolderName, completedUserFolderPath, function(error){
                                            if(error){
                                                console.log(error);
                                            } else {
                                                console.log("successfully moved log file to completed user folder");
                                            }
                                        });
                                    } else {
                                        console.log(error);
                                    }
                                });
                            } else {
                                logsManager.moveLogFileToCompletedUserFolder(logFilePath, currentCompletedFolderName, completedUserFolderPath, function(error){
                                    if(error){
                                        console.log(error);
                                    } else {
                                        console.log("successfully moved log file to completed user folder");
                                    }
                                });
                            }
                        });
                    } else {
                        console.log(error);
                    }
                });
            });

            socket.on('error', function(reason){
                console.log('Error:', reason, "userID:", userID, "visitID:", visitID);
            });
        });
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
