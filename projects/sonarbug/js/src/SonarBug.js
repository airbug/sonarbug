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

var bugpack = require('bugpack').context(module);
var http = require('http');
var path = require('path');
var io = require('socket.io');
var express = require(express);

//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------


var SonarBug = Class.extend(Obj, {
   _constructor: function(){
       
   },
   
   initialize: function(){
       this.app = express();
       
       this.configure(app, express, function(){
           console.log("SonarBug configured");
       });
   },
   
   start: function(){
       console.log("Starting SonarBug...");

       var app = this.app;

       //TODO: Allow this value to be configurable using a configuration json file.
       var port = this.port || 8000;

       this.configure(function(){
           console.log("SonarBug configured");
       });
       
       // Create Server
       var server = http.createServer(app);

       this.enableSockets(server, function(){
           console.log("SonarBug sockets enabled");
       });

       server.listen(app.get('port'), function(){
           console.log("SonarBug successfully started");
           console.log("SonarBug listening on port", app.get('port'));
       });
   },

   configure: function(app, callback){
       app.configure(function(){
           app.set('port', process.env.PORT || 3000);
           // app.use(express.favicon());
           app.use(express.logger('dev'));
           // app.use(express.bodyParser());
           // app.use(express.methodOverride());
           app.use(app.router);
           app.use(express.static(path.join(__dirname, 'public')));
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

           socket.on('error', function(reason){
              console.log('Error:', reason); 
           });

           socket.on('tracklog', function(data){
               var visitID = data.visitID;
               var userID = data.userID;
               var writeStream = fs.createWriteStream(userId + path.sep + visitID + '.log', { flags: 'w', encoding: null, mode: 0666 });
               writeStream.write(data, function(){
                   writeStream.end();
               })
               
               writeStream.on("end", function() {
                 stream.end();
               });
           });

           socket.on('disconnect', function(data){
               
           });
       });
   }
});

//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

bugpack.export('sonarbug.SonarBug', SonarBug);