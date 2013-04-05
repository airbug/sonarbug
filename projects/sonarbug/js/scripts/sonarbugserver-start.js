//-------------------------------------------------------------------------------
// Requires
//-------------------------------------------------------------------------------

//@Require('sonarbug.SonarBug')

//-------------------------------------------------------------------------------
// Common Modules
//-------------------------------------------------------------------------------

var bugpack = require('bugpack').context(module);

//-------------------------------------------------------------------------------
// BugPack
//-------------------------------------------------------------------------------

var SonarBug = bugpack.require('sonarbug.SonarBug');


//-------------------------------------------------------------------------------
// Bootstrap
//-------------------------------------------------------------------------------

// TODO: this should create a new instance of DeployBugServer
// var deployBugServer = new DeployBugServer();
// or var deployBugServer = bugpack.require('deploybug.DeployBugServer');

var sonarBug = new SonarBug();
sonarBug.start();