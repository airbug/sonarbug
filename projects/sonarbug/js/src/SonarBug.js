//-------------------------------------------------------------------------------
// Requires
//-------------------------------------------------------------------------------

//@Package('sonarbug')

//@Export('SonarBug')

//@Require('bugflow.BugFlow')
//@Require('bugfs.BugFs')
//@Require('Class')
//@Require('Obj')

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
// BugPack
//-------------------------------------------------------------------------------

var Class       = bugpack.require('Class');
var Obj         = bugpack.require('Obj');

//-------------------------------------------------------------------------------
//
//-------------------------------------------------------------------------------

var SonarBug = Class.extend(Obj, {
    _constructor: function(){
        this.app = null;
        this.server = null;
    },

    start: function(){
        console.log("Starting SonarBug...");

        var app = this.app = express();

        //TODO: Allow this value to be configurable using a configuration json file.
        this.configure(app, express, function(){
            console.log("SonarBug configured");
        });

        // Create Server
        var server = this.server = http.createServer(app);

        this.enableSockets(server, function(){
            console.log("SonarBug sockets enabled");
        });

        server.listen(app.get('port'), function(){
            console.log("SonarBug successfully started");
            console.log("SonarBug listening on port", app.get('port'));
        });
    },

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

    enableSockets: function(server){
        var ioManager = io.listen(server);
        ioManager.sockets.on('connection', function (socket) {
            console.log("Connection established")
            var userID;
            var visitID;
            var logFileName;

            socket.on('startTracking', function(data){
                userID = data.userID;
                visitID = data.visitID;
                logFileName = userID + '/' + visitID + '.log';

                if(!fs.existsSync(userID + '/')){
                    fs.mkdirSync(userID + '/', 0777);
                }

                fs.appendFile(logFileName, JSON.stringify(data) + '\n', function(){});

                socket.removeAllListeners('startTracking');
                console.log("startTracking:", "userID:", userID, "visitID:", visitID);
            })

            socket.on('tracklog', function(data){
                logFileName = logFileName || userID + '/' + visitID + '.log';
                fs.appendFile(logFileName, JSON.stringify(data) + '\n', function(){});
                console.log("tracklog:", "userID:", userID, "visitID:", visitID);
            });

            socket.on('disconnect', function(){
                logFileName = logFileName || userID + '/' + visitID + '.log';
                var data = {
                    "eventName": 'disconnect',
                    "userID": userID,
                    "visitID": visitID,
                    "data": {
                        "timestamp": new Date()
                    }
                };
                fs.appendFile(logFileName, JSON.stringify(data) + '\n', function(){});
                console.log("disconnect:", "userID:", userID, "visitID:", visitID);
            });

            socket.on('error', function(reason){
                console.log('Error:', reason, "userID:", userID, "visitID:", visitID);
            });
        });
    }
});

//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

bugpack.export('sonarbug.SonarBug', SonarBug);