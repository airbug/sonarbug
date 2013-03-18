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
    sonarbug: {
        packageJson: {
            name: "sonarbug",
            version: "0.0.1",
            main: "./lib/SonarBug.js",
            dependencies: {
                bugpack: "https://s3.amazonaws.com/airbug/bugpack-0.0.4.tgz",
                "express": "3.1.x",
                "socket.io": "0.9.x"
            },
            scripts: {}
        },
        sourcePaths: [
            "./projects/sonarbug/js/src",
            "../bugjs/projects/bugjs/js/src",
            "../bugjs/projects/bugtrace/js/src",
            '../bugjs/projects/bugflow/js/src',
            '../bugjs/projects/bugboil/js/src',
            "../bugjs/projects/bugfs/js/src",
            "../bugjs/projects/annotate/js/src",
            "../bugunit/projects/bugunit/js/src"
        ],
        scriptPaths: [
            "./projects/sonarbug/js/scripts",
            "../bugunit/projects/bugunit/js/scripts"
        ],
        testPaths: [
            "../bugjs/projects/bugjs/js/test"
        ],
        binPaths: [
            "./projects/deploybug/bin"
        ]
    },
    splitbugserver: {
        packageJson: {
            name: "splitbugserver",
            version: "0.0.1",
            main: "./lib/SplitBugServer.js",
            dependencies: {
                bugpack: "https://s3.amazonaws.com/airbug/bugpack-0.0.4.tgz",
                "express": "3.1.x",
                "socket.io": "0.9.x"
            },
            scripts: {}
        },
        sourcePaths: [
            "./projects/splitbugserver/js/src",
            "../bugjs/projects/bugjs/js/src",
            "../bugjs/projects/bugtrace/js/src",
            '../bugjs/projects/bugflow/js/src',
            '../bugjs/projects/bugboil/js/src',
            "../bugjs/projects/bugfs/js/src",
            "../bugjs/projects/annotate/js/src",
            "../bugunit/projects/bugunit/js/src"
        ],
        scriptPaths: [
            "./projects/splitbugserver/js/scripts",
            "../bugunit/projects/bugunit/js/scripts"
        ],
        testPaths: [
            "../bugjs/projects/bugjs/js/test"
        ]
    },
    splitbugclient: {
        packageJson: {
            name: "splitbugclient",
            version: "0.0.1",
            main: "./lib/SplitBugClient.js",
            dependencies: {
                bugpack: "https://s3.amazonaws.com/airbug/bugpack-0.0.3.tgz",
                "socket.io-client": "0.9.x"
            },
            scripts: {}
        },
        sourcePaths: [
            "./projects/splitbugclient/js/src",
            "../bugjs/projects/bugjs/js/src",
            "../bugjs/projects/bugtrace/js/src",
            '../bugjs/projects/bugflow/js/src',
            '../bugjs/projects/bugboil/js/src',
            "../bugjs/projects/bugfs/js/src",
            "../bugjs/projects/annotate/js/src",
            "../bugunit/projects/bugunit/js/src"
        ],
        scriptPaths: [
            "./projects/splitbugclient/js/scripts",
            "../bugunit/projects/bugunit/js/scripts"
        ],
        testPaths: [
            "../bugjs/projects/bugjs/js/test"
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
                        packageJson: buildProject.getProperty("sonarbug.packageJson"),
                        sourcePaths: buildProject.getProperty("sonarbug.sourcePaths"),
                        scriptPaths: buildProject.getProperty("sonarbug.scriptPaths"),
                        testPaths: buildProject.getProperty("sonarbug.testPaths"),
                        binPaths: buildProject.getProperty("sonarbug.binPaths")
                    }
                }),
                targetTask('generateBugPackRegistry', {
                    init: function(task, buildProject, properties) {
                        var nodePackage = nodejs.findNodePackage(
                            buildProject.getProperty("sonarbug.packageJson.name"),
                            buildProject.getProperty("sonarbug.packageJson.version")
                        );
                        task.updateProperties({
                            sourceRoot: nodePackage.getBuildPath()
                        });
                    }
                }),
                targetTask('packNodePackage', {
                    properties: {
                        packageName: buildProject.getProperty("sonarbug.packageJson.name"),
                        packageVersion: buildProject.getProperty("sonarbug.packageJson.version")
                    }
                }),
                // targetTask('startNodeModuleTests', {
                //     init: function(task, buildProject, properties) {
                //         var packedNodePackage = nodejs.findPackedNodePackage(
                //             buildProject.getProperty("sonarbug.packageJson.name"),
                //             buildProject.getProperty("sonarbug.packageJson.version")
                //         );
                //         task.updateProperties({
                //             modulePath: packedNodePackage.getFilePath()
                //         });
                //     }
                // }),
                targetTask("s3EnsureBucket", {
                    properties: {
                        bucket: buildProject.getProperty("local-bucket")
                    }
                }),
                targetTask("s3PutFile", {
                    init: function(task, buildProject, properties) {
                        var packedNodePackage = nodejs.findPackedNodePackage(buildProject.getProperty("sonarbug.packageJson.name"),
                            buildProject.getProperty("sonarbug.packageJson.version"));
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
            ]),
            series([
                targetTask('createNodePackage', {
                    properties: {
                        packageJson: buildProject.getProperty("splitbugserver.packageJson"),
                        sourcePaths: buildProject.getProperty("splitbugserver.sourcePaths"),
                        scriptPaths: buildProject.getProperty("deploybugserver.scriptPaths"),
                        testPaths: buildProject.getProperty("splitbugserver.testPaths"),
                        binPaths: buildProject.getProperty("splitbugserver.binPaths")
                    }
                }),
                targetTask('generateBugPackRegistry', {
                    init: function(task, buildProject, properties) {
                        var nodePackage = nodejs.findNodePackage(
                            buildProject.getProperty("splitbugserver.packageJson.name"),
                            buildProject.getProperty("splitbugserver.packageJson.version")
                        );
                        task.updateProperties({
                            sourceRoot: nodePackage.getBuildPath()
                        });
                    }
                }),
                targetTask('packNodePackage', {
                    properties: {
                        packageName: buildProject.getProperty("splitbugserver.packageJson.name"),
                        packageVersion: buildProject.getProperty("splitbugserver.packageJson.version")
                    }
                }),
                // targetTask('startNodeModuleTests', {
                //     init: function(task, buildProject, properties) {
                //         var packedNodePackage = nodejs.findPackedNodePackage(
                //             buildProject.getProperty("splitbugserver.packageJson.name"),
                //             buildProject.getProperty("splitbugserver.packageJson.version")
                //         );
                //         task.updateProperties({
                //             modulePath: packedNodePackage.getFilePath()
                //         });
                //     }
                // }),
                targetTask("s3EnsureBucket", {
                    properties: {
                        bucket: buildProject.getProperty("local-bucket")
                    }
                }),
                targetTask("s3PutFile", {
                    init: function(task, buildProject, properties) {
                        var packedNodePackage = nodejs.findPackedNodePackage(buildProject.getProperty("splitbugserver.packageJson.name"),
                            buildProject.getProperty("splitbugserver.packageJson.version"));
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
            ]),
            series([
                targetTask('createNodePackage', {
                    properties: {
                        packageJson: buildProject.getProperty("splitbugclient.packageJson"),
                        sourcePaths: buildProject.getProperty("splitbugclient.sourcePaths"),
                        scriptPaths: buildProject.getProperty("splitbugclient.scriptPaths"),
                        testPaths: buildProject.getProperty("splitbugclient.testPaths"),
                        binPaths: buildProject.getProperty("splitbugclient.binPaths")
                    }
                }),
                targetTask('generateBugPackRegistry', {
                    init: function(task, buildProject, properties) {
                        var nodePackage = nodejs.findNodePackage(
                            buildProject.getProperty("splitbugclient.packageJson.name"),
                            buildProject.getProperty("splitbugclient.packageJson.version")
                        );
                        task.updateProperties({
                            sourceRoot: nodePackage.getBuildPath()
                        });
                    }
                }),
                targetTask('packNodePackage', {
                    properties: {
                        packageName: buildProject.getProperty("splitbugclient.packageJson.name"),
                        packageVersion: buildProject.getProperty("splitbugclient.packageJson.version")
                    }
                }),
                // targetTask('startNodeModuleTests', {
                //     init: function(task, buildProject, properties) {
                //         var packedNodePackage = nodejs.findPackedNodePackage(
                //             buildProject.getProperty("splitbugclient.packageJson.name"),
                //             buildProject.getProperty("splitbugclient.packageJson.version")
                //         );
                //         task.updateProperties({
                //             modulePath: packedNodePackage.getFilePath()
                //         });
                //     }
                // }),
                targetTask("s3EnsureBucket", {
                    properties: {
                        bucket: buildProject.getProperty("local-bucket")
                    }
                }),
                targetTask("s3PutFile", {
                    init: function(task, buildProject, properties) {
                        var packedNodePackage = nodejs.findPackedNodePackage(buildProject.getProperty("splitbugclient.packageJson.name"),
                            buildProject.getProperty("splitbugclient.packageJson.version"));
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
                        packageJson: buildProject.getProperty("sonarbug.packageJson"),
                        sourcePaths: buildProject.getProperty("sonarbug.sourcePaths"),
                        scriptPaths: buildProject.getProperty("sonarbug.scriptPaths"),
                        testPaths: buildProject.getProperty("sonarbug.testPaths"),
                        binPaths: buildProject.getProperty("sonarbug.binPaths")
                    }
                }),
                targetTask('generateBugPackRegistry', {
                    init: function(task, buildProject, properties) {
                        var nodePackage = nodejs.findNodePackage(
                            buildProject.getProperty("sonarbug.packageJson.name"),
                            buildProject.getProperty("sonarbug.packageJson.version")
                        );
                        task.updateProperties({
                            sourceRoot: nodePackage.getBuildPath()
                        });
                    }
                }),
                targetTask('packNodePackage', {
                    properties: {
                        packageName: buildProject.getProperty("sonarbug.packageJson.name"),
                        packageVersion: buildProject.getProperty("sonarbug.packageJson.version")
                    }
                }),
                targetTask('startNodeModuleTests', {
                    init: function(task, buildProject, properties) {
                        var packedNodePackage = nodejs.findPackedNodePackage(
                            buildProject.getProperty("sonarbug.packageJson.name"),
                            buildProject.getProperty("sonarbug.packageJson.version")
                        );
                        task.updateProperties({
                            modulePath: packedNodePackage.getFilePath()
                        });
                    }
                }),
                targetTask("s3EnsureBucket", {
                    properties: {
                        bucket: "airbug"
                    }
                }),
                targetTask("s3PutFile", {
                    init: function(task, buildProject, properties) {
                        var packedNodePackage = nodejs.findPackedNodePackage(buildProject.getProperty("sonarbug.packageJson.name"),
                            buildProject.getProperty("sonarbug.packageJson.version"));
                        task.updateProperties({
                            file: packedNodePackage.getFilePath(),
                            options: {
                                acl: 'public-read'
                            }
                        });
                    },
                    properties: {
                        bucket: "airbug"
                    }
                })
            ]),
            series([
                targetTask('createNodePackage', {
                    properties: {
                        packageJson: buildProject.getProperty("splitbugserver.packageJson"),
                        sourcePaths: buildProject.getProperty("splitbugserver.sourcePaths"),
                        scriptPaths: buildProject.getProperty("splitbugserver.scriptPaths"),
                        testPaths: buildProject.getProperty("splitbugserver.testPaths"),
                        binPaths: buildProject.getProperty("splitbugserver.binPaths")
                    }
                }),
                targetTask('generateBugPackRegistry', {
                    init: function(task, buildProject, properties) {
                        var nodePackage = nodejs.findNodePackage(
                            buildProject.getProperty("splitbugserver.packageJson.name"),
                            buildProject.getProperty("splitbugserver.packageJson.version")
                        );
                        task.updateProperties({
                            sourceRoot: nodePackage.getBuildPath()
                        });
                    }
                }),
                targetTask('packNodePackage', {
                    properties: {
                        packageName: buildProject.getProperty("splitbugserver.packageJson.name"),
                        packageVersion: buildProject.getProperty("splitbugserver.packageJson.version")
                    }
                }),
                targetTask('startNodeModuleTests', {
                    init: function(task, buildProject, properties) {
                        var packedNodePackage = nodejs.findPackedNodePackage(
                            buildProject.getProperty("splitbugserver.packageJson.name"),
                            buildProject.getProperty("splitbugserver.packageJson.version")
                        );
                        task.updateProperties({
                            modulePath: packedNodePackage.getFilePath()
                        });
                    }
                }),
                targetTask("s3EnsureBucket", {
                    properties: {
                        bucket: "airbug"
                    }
                }),
                targetTask("s3PutFile", {
                    init: function(task, buildProject, properties) {
                        var packedNodePackage = nodejs.findPackedNodePackage(buildProject.getProperty("splitbugserver.packageJson.name"),
                            buildProject.getProperty("splitbugserver.packageJson.version"));
                        task.updateProperties({
                            file: packedNodePackage.getFilePath(),
                            options: {
                                acl: 'public-read'
                            }
                        });
                    },
                    properties: {
                        bucket: "airbug"
                    }
                })
            ]),
            series([
                targetTask('createNodePackage', {
                    properties: {
                        packageJson: buildProject.getProperty("splitbugclient.packageJson"),
                        sourcePaths: buildProject.getProperty("splitbugclient.sourcePaths"),
                        scriptPaths: buildProject.getProperty("splitbugclient.scriptPaths"),
                        testPaths: buildProject.getProperty("splitbugclient.testPaths"),
                        binPaths: buildProject.getProperty("splitbugclient.binPaths")
                    }
                }),
                targetTask('generateBugPackRegistry', {
                    init: function(task, buildProject, properties) {
                        var nodePackage = nodejs.findNodePackage(
                            buildProject.getProperty("splitbugclient.packageJson.name"),
                            buildProject.getProperty("splitbugclient.packageJson.version")
                        );
                        task.updateProperties({
                            sourceRoot: nodePackage.getBuildPath()
                        });
                    }
                }),
                targetTask('packNodePackage', {
                    properties: {
                        packageName: buildProject.getProperty("splitbugclient.packageJson.name"),
                        packageVersion: buildProject.getProperty("splitbugclient.packageJson.version")
                    }
                }),
                targetTask('startNodeModuleTests', {
                    init: function(task, buildProject, properties) {
                        var packedNodePackage = nodejs.findPackedNodePackage(
                            buildProject.getProperty("splitbugclient.packageJson.name"),
                            buildProject.getProperty("splitbugclient.packageJson.version")
                        );
                        task.updateProperties({
                            modulePath: packedNodePackage.getFilePath()
                        });
                    }
                }),
                targetTask("s3EnsureBucket", {
                    properties: {
                        bucket: "airbug"
                    }
                }),
                targetTask("s3PutFile", {
                    init: function(task, buildProject, properties) {
                        var packedNodePackage = nodejs.findPackedNodePackage(buildProject.getProperty("splitbugclient.packageJson.name"),
                            buildProject.getProperty("splitbugclient.packageJson.version"));
                        task.updateProperties({
                            file: packedNodePackage.getFilePath(),
                            options: {
                                acl: 'public-read'
                            }
                        });
                    },
                    properties: {
                        bucket: "airbug"
                    }
                })
            ])
        ])
    ])
);
