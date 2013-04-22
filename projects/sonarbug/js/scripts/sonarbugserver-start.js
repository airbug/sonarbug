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

var sonarBug = new SonarBug();
sonarBug.start();
