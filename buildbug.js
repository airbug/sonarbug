//-------------------------------------------------------------------------------
// Requires
//-------------------------------------------------------------------------------

var buildbug            = require('buildbug');


//-------------------------------------------------------------------------------
// Simplify References
//-------------------------------------------------------------------------------

var buildProject        = buildbug.buildProject;
var buildProperties     = buildbug.buildProperties;
var buildScript         = buildbug.buildScript;
var buildTarget         = buildbug.buildTarget;
var enableModule        = buildbug.enableModule;
var parallel            = buildbug.parallel;
var series              = buildbug.series;
var targetTask          = buildbug.targetTask;


//-------------------------------------------------------------------------------
// Enable Modules
//-------------------------------------------------------------------------------

var aws                 = enableModule("aws");
var bugpack             = enableModule('bugpack');
var bugunit             = enableModule('bugunit');
var core                = enableModule('core');
var lintbug             = enableModule("lintbug");
var nodejs              = enableModule('nodejs');


//-------------------------------------------------------------------------------
// Values
//-------------------------------------------------------------------------------

var name                = "sonarbug";
var version             = "0.0.7";
var dependencies        = {
    "aws-sdk": "0.9.x",
    "bugpack": "0.1.6",
    "cron": "1.0.x",
    "express": "3.1.x",
    "fstream": '0.1.x',
    "socket.io": "0.9.x",
    "tar": 'git://github.com/airbug/node-tar.git#master',
    "time": "0.9.x"
};


//-------------------------------------------------------------------------------
// Declare Properties
//-------------------------------------------------------------------------------

buildProperties({
    name: name,
    version: version
});

buildProperties({
    server: {
        packageJson: {
            name: "{{name}}server",
            version: "{{version}}",
            dependencies: dependencies,
            scripts: {
                "start": "node ./scripts/sonarbugserver-application-start.js"
            }
        },
        sourcePaths: [
            "./projects/sonarbugserver/js/src",
            "../bugaws/libraries/bugaws/js/src",
            "../bugcore/libraries/bugcore/js/src",
            "../bugfs/libraries/bugfs/js/src",
            "../bugioc/libraries/bugioc/js/src",
            "../bugjs/projects/express/js/src",
            "../bugmeta/libraries/bugmeta/js/src"
        ],
        scriptPaths: [
            "./projects/sonarbugserver/js/scripts"
        ],
        unitTest: {
            packageJson: {
                name: "{{name}}server-test",
                version: "{{version}}",
                dependencies: dependencies,
                private: true,
                scripts: {
                    test: "node ./test/scripts/bugunit-run.js"
                }
            },
            sourcePaths: [
                "../buganno/libraries/buganno/js/src",
                "../bugdouble/libraries/bugdouble/js/src",
                "../bugunit/libraries/bugunit/js/src",
                "../bugyarn/libraries/bugyarn/js/src"
            ],
            scriptPaths: [
                "../buganno/libraries/buganno/js/scripts",
                "../bugunit/libraries/bugunit/js/scripts"
            ],
            testPaths: [
                "../bugcore/libraries/bugcore/js/test",
                "../bugioc/libraries/bugioc/js/test",
                "./projects/sonarbugserver/js/test"
            ]
        }
    },
    lint: {
        targetPaths: [
            "."
        ],
        ignorePatterns: [
            ".*\\.buildbug$",
            ".*\\.bugunit$",
            ".*\\.git$",
            ".*node_modules$"
        ]
    }
});


//-------------------------------------------------------------------------------
// Declare BuildTargets
//-------------------------------------------------------------------------------

// Clean BuildTarget
//-------------------------------------------------------------------------------

buildTarget('clean').buildFlow(
    targetTask('clean')
);


// Local BuildTarget
//-------------------------------------------------------------------------------

buildTarget('local').buildFlow(
    series([

        // TODO BRN: This "clean" task is temporary until we're not modifying the build so much. This also ensures that
        // old source files are removed. We should figure out a better way of doing that.

        targetTask('clean'),
        targetTask('lint', {
            properties: {
                targetPaths: buildProject.getProperty("lint.targetPaths"),
                ignores: buildProject.getProperty("lint.ignorePatterns"),
                lintTasks: [
                    "cleanupExtraSpacingAtEndOfLines",
                    "ensureNewLineEnding",
                    "indentEqualSignsForPreClassVars",
                    "orderBugpackRequires",
                    "orderRequireAnnotations",
                    "updateCopyright"
                ]
            }
        }),
        parallel([
            series([
                targetTask('createNodePackage', {
                    properties: {
                        packageJson: buildProject.getProperty("server.packageJson"),
                        packagePaths: {
                            "./lib": buildProject.getProperty("server.sourcePaths"),
                            "./scripts": buildProject.getProperty("server.scriptPaths"),
                            "./test": buildProject.getProperty("server.unitTest.testPaths"),
                            "./test/lib": buildProject.getProperty("server.unitTest.sourcePaths"),
                            "./test/scripts": buildProject.getProperty("server.unitTest.scriptPaths")
                        }
                    }
                }),
                targetTask('generateBugPackRegistry', {
                    init: function(task, buildProject, properties) {
                        var nodePackage = nodejs.findNodePackage(
                            buildProject.getProperty("server.packageJson.name"),
                            buildProject.getProperty("server.packageJson.version")
                        );
                        task.updateProperties({
                            sourceRoot: nodePackage.getBuildPath()
                        });
                    }
                }),
                targetTask('packNodePackage', {
                    properties: {
                        packageName: buildProject.getProperty("server.packageJson.name"),
                        packageVersion: buildProject.getProperty("server.packageJson.version")
                    }
                }),
                targetTask('startNodeModuleTests', {
                    init: function(task, buildProject, properties) {
                        var packedNodePackage = nodejs.findPackedNodePackage(
                            buildProject.getProperty("server.packageJson.name"),
                            buildProject.getProperty("server.packageJson.version")
                        );
                        task.updateProperties({
                            modulePath: packedNodePackage.getFilePath()
                        });
                    }
                }),
                targetTask("s3PutFile", {
                    init: function(task, buildProject, properties) {
                        var packedNodePackage = nodejs.findPackedNodePackage(buildProject.getProperty("server.packageJson.name"),
                            buildProject.getProperty("server.packageJson.version"));
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


// Prod BuildTarget
//-------------------------------------------------------------------------------

buildTarget('prod').buildFlow(
    series([

        // TODO BRN: This "clean" task is temporary until we're not modifying the build so much. This also ensures that
        // old source files are removed. We should figure out a better way of doing that.

        targetTask('clean'),
        targetTask('lint', {
            properties: {
                targetPaths: buildProject.getProperty("lint.targetPaths"),
                ignores: buildProject.getProperty("lint.ignorePatterns"),
                lintTasks: [
                    "cleanupExtraSpacingAtEndOfLines",
                    "ensureNewLineEnding",
                    "indentEqualSignsForPreClassVars",
                    "orderBugpackRequires",
                    "orderRequireAnnotations",
                    "updateCopyright"
                ]
            }
        }),
        parallel([
            series([
                targetTask('createNodePackage', {
                    properties: {
                        packageJson: buildProject.getProperty("server.packageJson"),
                        packagePaths: {
                            "./lib": buildProject.getProperty("server.sourcePaths"),
                            "./scripts": buildProject.getProperty("server.scriptPaths"),
                            "./test": buildProject.getProperty("server.unitTest.testPaths"),
                            "./test/lib": buildProject.getProperty("server.unitTest.sourcePaths"),
                            "./test/scripts": buildProject.getProperty("server.unitTest.scriptPaths")
                        }
                    }
                }),
                targetTask('generateBugPackRegistry', {
                    init: function(task, buildProject, properties) {
                        var nodePackage = nodejs.findNodePackage(
                            buildProject.getProperty("server.packageJson.name"),
                            buildProject.getProperty("server.packageJson.version")
                        );
                        task.updateProperties({
                            sourceRoot: nodePackage.getBuildPath()
                        });
                    }
                }),
                targetTask('packNodePackage', {
                    properties: {
                        packageName: buildProject.getProperty("server.packageJson.name"),
                        packageVersion: buildProject.getProperty("server.packageJson.version")
                    }
                }),
                targetTask('startNodeModuleTests', {
                    init: function(task, buildProject, properties) {
                        var packedNodePackage = nodejs.findPackedNodePackage(
                            buildProject.getProperty("server.packageJson.name"),
                            buildProject.getProperty("server.packageJson.version")
                        );
                        task.updateProperties({
                            modulePath: packedNodePackage.getFilePath()
                        });
                    }
                }),
                targetTask("s3PutFile", {
                    init: function(task, buildProject, properties) {
                        var packedNodePackage = nodejs.findPackedNodePackage(buildProject.getProperty("server.packageJson.name"),
                            buildProject.getProperty("server.packageJson.version"));
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

//-------------------------------------------------------------------------------
// Build Scripts
//-------------------------------------------------------------------------------

buildScript({
    dependencies: [
        "bugcore",
        "bugflow",
        "bugfs"
    ],
    script: "./lintbug.js"
});
