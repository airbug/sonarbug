//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Package('splitbug')

//@Export('SplitBugServer')

//@Require('Class')
//@Require('Map')
//@Require('Obj')
//@Require('bugflow.BugFlow')
//@Require('bugfs.BugFs')
//@Require('riak.RiakDb')
//@Require('splitbug.SplitTestApi')
//@Require('splitbug.SplitTestSession')
//@Require('splitbug.SplitTestSessionApi')
//@Require('splitbug.SplitTestUserApi')


//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context();
var express = require('express');
var http = require('http');
var path = require('path');
var child_process = require('child_process');
var cron = require('cron');


//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var Class =                 bugpack.require('Class');
var Map =                   bugpack.require('Map');
var Obj =                   bugpack.require('Obj');
var BugFlow =               bugpack.require('bugflow.BugFlow');
var BugFs =                 bugpack.require('bugfs.BugFs');
var RiakDb =                bugpack.require('riak.RiakDb');
var SplitTestApi =          bugpack.require('splitbug.SplitTestApi');
var SplitTestSession =      bugpack.require('splitbug.SplitTestSession');
var SplitTestSessionApi =   bugpack.require('splitbug.SplitTestSessionApi');
var SplitTestUserApi =      bugpack.require('splitbug.SplitTestUserApi');


//-------------------------------------------------------------------------------
// Simplify References
//-------------------------------------------------------------------------------

var $series             = BugFlow.$series;
var $task               = BugFlow.$task;


//-------------------------------------------------------------------------------
// Declare Class
//-------------------------------------------------------------------------------

var SplitBugServer = Class.extend(Obj, {

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
         * @type {*}
         */
        this.app = null;

        /**
         * @private
         * @type {Object}
         */
        this.config = {
            port: 8080,
            riakHost: "localhost",
            riakPort: "8098"
        };

        /**
         * @private
         * @type {boolean}
         */
        this.started = false;
    },


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
            }),
            $task(function(flow) {
                SplitTestApi.configure(function(error) {
                    flow.complete(error);
                });
            })
        ]).execute(callback);
    },

    /**
     *
     */
    start: function() {
        var _this = this;
        if (!this.started) {
            this.started = true;

            //TODO BRN: This cron job will only work temporarily and will NOT work when we have more than one server
            // This is because we will have multiple servers trying to perform a count on our split test sessions.
            // Instead we need to move this to an externally configured and run cron engine that knows to only run
            // the script on one server (some sort of lock key would allow that to happen)

            var job = new cron.CronJob({
                cronTime: '*/5 * * * *',
                onTick: function() {
                    var countScriptPath = path.resolve(__dirname, "../scripts/splitbug-count-tests-task.js");
                    var child = child_process.exec("node " + countScriptPath , function (error, stdout, stderr) {
                        console.log('stdout: ' + stdout);
                        console.log('stderr: ' + stderr);
                        if (error !== null) {
                            console.error('exec error: ', error);
                        } else {
                            SplitTestApi.refresh(function(error) {
                                if (!error) {
                                    console.log("SplitTestApi refreshed");
                                } else {
                                    console.error("An error occurred while refreshing the split test API");
                                    console.error(error);
                                    console.error(error.stack);
                                }
                            });
                        }
                    });
                },
                start: true
            });
            job.start();

            this.app = express();

            this.app.configure(function() {
                _this.app.use(function (req, res, next) {
                    res.removeHeader("X-Powered-By");
                    next();
                });
                _this.app.set('port', _this.config.port);
                _this.app.use(express.logger('dev'));
                _this.app.use(express.bodyParser());
                _this.app.use(express.methodOverride()); // put and delete support for html 4 and older
                _this.app.use(_this.app.router);
            });

            this.app.configure('development', function(){
                _this.app.use(express.errorHandler());
            });


            // Routes
            //-------------------------------------------------------------------------------

            // NOTE BRN: This ensures that we don't send the powered-by header. These headers don't really do anything
            // and just make it easier for hackers to exploit your system.
            // http://serverfault.com/questions/395332/whats-the-use-of-x-powered-by-server-and-other-similar-http-headers

            this.app.get('/', function(req, res) {
                var foo = {
                    title: "splitbug"
                };
                res.json(foo);
            });

            this.app.all('/api/*', function(req, res, next){
                res.header("Access-Control-Allow-Origin", "*");
                res.header("Access-Control-Allow-Headers", "X-Requested-With");
                res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
                res.header("Access-Control-Allow-Headers", "Content-Type");
                next();
            });

            this.app.options('/api/split-test-session/establish', function(req, res) {
                res.status(200);
                res.end();
            });

            this.app.post('/api/split-test-session/establish', function(req, res) {
                var data = req.body;
                SplitTestSessionApi.establishSplitTestSession(data.userUuid, function(error, splitTestSession) {
                    if (!error) {
                        res.header("Content-Type", "application/json");
                        res.status(200);
                        res.write(JSON.stringify({splitTestSession: splitTestSession.toObject()}));
                        res.end();
                    } else {
                        console.error("An error occurred while trying to establish a split test session.", error);
                        console.error(error.stack);
                        res.header("Content-Type", "application/json");
                        res.status(500);
                        res.write(JSON.stringify({error: "An error occurred while trying to establish a split test session"}));
                        res.end();
                    }
                })
            });

            this.app.options('/api/split-test-session/validate', function(req, res) {
                res.status(200);
                res.end();
            });

            this.app.post('/api/split-test-session/validate', function(req, res) {
                var data = req.body;
                //TODO BRN: Vaildate the data here
                var splitTestSession = new SplitTestSession(data.splitTestSession);
                SplitTestSessionApi.validateSplitTestSession(splitTestSession, function(error, valid) {
                    if (!error) {
                        res.header("Content-Type", "application/json");
                        res.status(200);
                        res.write(JSON.stringify({valid: valid}));
                        res.end();
                    } else {
                        console.error("An error occurred while trying to validate a split test session.", error);
                        console.error(error.stack);
                        res.header("Content-Type", "application/json");
                        res.status(500);
                        res.write(JSON.stringify({error: "An error occurred while trying to validate a split test session"}));
                        res.end();
                    }
                });
            });


            this.app.options('/api/split-test-user/generate', function(req, res) {
                res.status(200);
                res.end();
            });

            this.app.post('/api/split-test-user/generate', function(req, res) {
                SplitTestUserApi.generateSplitTestUser(function(error, splitTestUser) {
                    if (!error) {
                        res.header("Content-Type", "application/json");
                        res.status(200);
                        res.write(JSON.stringify({splitTestUser: splitTestUser.toObject()}));
                        res.end();
                    } else {
                        console.error("An error occurred while trying to generate a split test user.", error);
                        console.error(error.stack);
                        res.header("Content-Type", "application/json");
                        res.status(500);
                        res.write(JSON.stringify({error: "An error occurred"}));
                        res.end();
                    }
                });
            });


            // Clean Up
            //-------------------------------------------------------------------------------

            process.on('SIGTERM', function () {
                console.log("SplitBug server closing");
                _this.app.close();
            });

            this.app.on('close', function () {
                console.log("SplitBug server closed");
            });

            http.createServer(this.app).listen(this.app.get('port'), function(){
                console.log("SplitBug server listening on port " + _this.app.get('port'));
            });
        }
    }
});


//-------------------------------------------------------------------------------
// Exports
//-------------------------------------------------------------------------------

bugpack.export('splitbug.SplitBugServer', SplitBugServer);
