//-------------------------------------------------------------------------------
// Requires
//-------------------------------------------------------------------------------

var buildbug = require('buildbug');


//-------------------------------------------------------------------------------
// Simplify References
//-------------------------------------------------------------------------------

var buildProject = buildbug.buildProject;
var buildProperties = buildbug.buildProperties;
var buildTarget = buildbug.buildTarget;
var enableModule = buildbug.enableModule;
var parallel = buildbug.parallel;
var series = buildbug.series;
var targetTask = buildbug.targetTask;


//-------------------------------------------------------------------------------
// Enable Modules
//-------------------------------------------------------------------------------

var aws = enableModule("aws");
var bugpack = enableModule('bugpack');
var bugunit = enableModule('bugunit');
var core = enableModule('core');
var nodejs = enableModule('nodejs');


//-------------------------------------------------------------------------------
// Declare Properties
//-------------------------------------------------------------------------------

buildProperties({
    sonarbugserver: {
        packageJson: {
            name: "sonarbugserver",
            version: "0.0.7",
            dependencies: {
                "aws-sdk": "0.9.x",
                "bugpack": "https://s3.amazonaws.com/airbug/bugpack-0.0.5.tgz",
                "cron": "1.0.x",
                "express": "3.1.x",
                "fstream": '0.1.x',
                "socket.io": "0.9.x",
                "tar": 'git://github.com/airbug/node-tar.git#master',
                "time": "0.9.x"
            },
            scripts: {
                "start": "node ./scripts/sonarbug-server-application-start.js"
            }
        },
        sourcePaths: [
            "./projects/sonarbugserver/js/src",
            "../bugjs/projects/bugmeta/js/src",
            "../bugjs/projects/aws/js/src",
            '../bugjs/projects/bugflow/js/src',
            "../bugjs/projects/bugfs/js/src",
            "../bugjs/projects/bugioc/js/src",
            "../bugjs/projects/bugjs/js/src",
            "../bugjs/projects/bugtrace/js/src",
            "../bugjs/projects/express/js/src",
            "../bugunit/projects/bugdouble/js/src",
            "../bugunit/projects/bugunit/js/src"
        ],
        scriptPaths: [
            "./projects/sonarbugserver/js/scripts",
            "../bugunit/projects/bugunit/js/scripts"
        ],
        testPaths: [
            "../bugjs/projects/bugioc/js/test",
            "../bugjs/projects/bugjs/js/test",
            "../bugjs/projects/bugtrace/js/test",
            "./projects/sonarbugserver/js/test"
        ]
    }
});


//-------------------------------------------------------------------------------
// Declare Tasks
//-------------------------------------------------------------------------------


//-------------------------------------------------------------------------------
// Declare Flows
//-------------------------------------------------------------------------------

// Clean Flow
//-------------------------------------------------------------------------------

buildTarget('clean').buildFlow(
    targetTask('clean')
);


// Local Flow
//-------------------------------------------------------------------------------

buildTarget('local').buildFlow(
    series([

        // TODO BRN: This "clean" task is temporary until we're not modifying the build so much. This also ensures that
        // old source files are removed. We should figure out a better way of doing that.

        targetTask('clean'),
        parallel([
            series([
                targetTask('createNodePackage', {
                    properties: {
                        packageJson: buildProject.getProperty("sonarbugserver.packageJson"),
                        sourcePaths: buildProject.getProperty("sonarbugserver.sourcePaths"),
                        scriptPaths: buildProject.getProperty("sonarbugserver.scriptPaths"),
                        testPaths: buildProject.getProperty("sonarbugserver.testPaths"),
                        binPaths: buildProject.getProperty("sonarbugserver.binPaths")
                    }
                }),
                targetTask('generateBugPackRegistry', {
                    init: function(task, buildProject, properties) {
                        var nodePackage = nodejs.findNodePackage(
                            buildProject.getProperty("sonarbugserver.packageJson.name"),
                            buildProject.getProperty("sonarbugserver.packageJson.version")
                        );
                        task.updateProperties({
                            sourceRoot: nodePackage.getBuildPath()
                        });
                    }
                }),
                targetTask('packNodePackage', {
                    properties: {
                        packageName: buildProject.getProperty("sonarbugserver.packageJson.name"),
                        packageVersion: buildProject.getProperty("sonarbugserver.packageJson.version")
                    }
                }),
                targetTask('startNodeModuleTests', {
                    init: function(task, buildProject, properties) {
                        var packedNodePackage = nodejs.findPackedNodePackage(
                            buildProject.getProperty("sonarbugserver.packageJson.name"),
                            buildProject.getProperty("sonarbugserver.packageJson.version")
                        );
                        task.updateProperties({
                            modulePath: packedNodePackage.getFilePath()
                        });
                    }
                }),
                targetTask("s3PutFile", {
                    init: function(task, buildProject, properties) {
                        var packedNodePackage = nodejs.findPackedNodePackage(buildProject.getProperty("sonarbugserver.packageJson.name"),
                            buildProject.getProperty("sonarbugserver.packageJson.version"));
                        task.updateProperties({
                            file: packedNodePackage.getFilePath(),
                            options: {
                                acl: 'public-read'
                            }
                        });
                    },
                    properties: {
                        bucket: buildProject.getProperty("local-bucket")
                    }
                })
            ])
        ])
    ])
).makeDefault();


// Prod Flow
//-------------------------------------------------------------------------------

buildTarget('prod').buildFlow(
    series([

        // TODO BRN: This "clean" task is temporary until we're not modifying the build so much. This also ensures that
        // old source files are removed. We should figure out a better way of doing that.

        targetTask('clean'),
        parallel([
            series([
                targetTask('createNodePackage', {
                    properties: {
                        packageJson: buildProject.getProperty("sonarbugserver.packageJson"),
                        sourcePaths: buildProject.getProperty("sonarbugserver.sourcePaths"),
                        scriptPaths: buildProject.getProperty("sonarbugserver.scriptPaths"),
                        testPaths: buildProject.getProperty("sonarbugserver.testPaths"),
                        binPaths: buildProject.getProperty("sonarbugserver.binPaths")
                    }
                }),
                targetTask('generateBugPackRegistry', {
                    init: function(task, buildProject, properties) {
                        var nodePackage = nodejs.findNodePackage(
                            buildProject.getProperty("sonarbugserver.packageJson.name"),
                            buildProject.getProperty("sonarbugserver.packageJson.version")
                        );
                        task.updateProperties({
                            sourceRoot: nodePackage.getBuildPath()
                        });
                    }
                }),
                targetTask('packNodePackage', {
                    properties: {
                        packageName: buildProject.getProperty("sonarbugserver.packageJson.name"),
                        packageVersion: buildProject.getProperty("sonarbugserver.packageJson.version")
                    }
                }),
                targetTask('startNodeModuleTests', {
                    init: function(task, buildProject, properties) {
                        var packedNodePackage = nodejs.findPackedNodePackage(
                            buildProject.getProperty("sonarbugserver.packageJson.name"),
                            buildProject.getProperty("sonarbugserver.packageJson.version")
                        );
                        task.updateProperties({
                            modulePath: packedNodePackage.getFilePath()
                        });
                    }
                }),
                targetTask("s3PutFile", {
                    init: function(task, buildProject, properties) {
                        var packedNodePackage = nodejs.findPackedNodePackage(buildProject.getProperty("sonarbugserver.packageJson.name"),
                            buildProject.getProperty("sonarbugserver.packageJson.version"));
                        task.updateProperties({
                            file: packedNodePackage.getFilePath(),
                            options: {
                                acl: 'public-read'
                            }
                        });
                    },
                    properties: {
                        bucket: "{{prod-deploy-bucket}}"
                    }
                })
            ])
        ])
    ])
);
