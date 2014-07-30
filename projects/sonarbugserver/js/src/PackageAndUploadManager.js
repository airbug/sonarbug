//-------------------------------------------------------------------------------
// Annotations
//-------------------------------------------------------------------------------

//@Export('sonarbugserver.PackageAndUploadManager')

//@Require('Class')
//@Require('Obj')
//@Require('aws.AwsConfig')
//@Require('aws.AwsUploader')
//@Require('aws.S3Api')
//@Require('aws.S3Bucket')
//@Require('Flows')
//@Require('bugfs.BugFs')
//@Require('bugfs.Path')


//-------------------------------------------------------------------------------
// Context
//-------------------------------------------------------------------------------

require('bugpack').context("*", function(bugpack) {

    //-------------------------------------------------------------------------------
    // Common Modules
    //-------------------------------------------------------------------------------

    var fs          = require('fs');
    var fstream     = require('fstream');
    var path        = require('path');
    var tar         = require('tar');
    var zlib        = require('zlib');


    //-------------------------------------------------------------------------------
    // Bugpack
    //-------------------------------------------------------------------------------

    var Class       = bugpack.require('Class');
    var Obj         = bugpack.require('Obj');
    var AwsConfig   = bugpack.require('aws.AwsConfig');
    var AwsUploader = bugpack.require('aws.AwsUploader');
    var S3Api       = bugpack.require('aws.S3Api');
    var S3Bucket    = bugpack.require('aws.S3Bucket');
    var Flows     = bugpack.require('Flows');
    var BugFs       = bugpack.require('bugfs.BugFs');
    var Path        = bugpack.require('bugfs.Path');


    //-------------------------------------------------------------------------------
    // Simplify References
    //-------------------------------------------------------------------------------

    var $forEachParallel    = Flows.$forEachParallel;
    var $series             = Flows.$series;
    var $task               = Flows.$task;


    //-------------------------------------------------------------------------------
    // Declare Class
    //-------------------------------------------------------------------------------

    /**
     * @class
     * @extends {Obj}
     */
    var PackageAndUploadManager = Class.extend(Obj, {

        _name: "sonarbugserver.PackageAndUploadManager",


        //-------------------------------------------------------------------------------
        // Constructor
        //-------------------------------------------------------------------------------

        /**
         * @constructs
         */
        _constructor: function() {

            this._super();


            //-------------------------------------------------------------------------------
            // Private Properties
            //-------------------------------------------------------------------------------

            /**
             * @private
             * @type {AwsUploader}
             */
            this.awsUploader            = null;

            /**
             * @private
             * @type {string}
             */
            this.packagedFolderPath     = null;

            /**
             * @private
             * @type {string}
             */
            this.toPackageFoldersPath   = null;
        },


        //-------------------------------------------------------------------------------
        // Public Methods
        //-------------------------------------------------------------------------------

        /**
         * @param {{
         *  packagedFolderPath: string
         *  toPackageFoldersPath: string,
         * }=} options
         * @param {function(error)} callback
         */
        initialize: function(options, callback) {
            console.log('PackageAndUploadManager initializing...');
            var _this = this;
            if (typeof options === 'function') {
                var callback = options;
                var options = null;
            }
            callback = callback || function() {};

            $series([
                $task(function(flow) {
                    // Defaults
                    _this.packagedFolderPath    = path.resolve(__dirname, '..', 'logs/', 'packaged/');
                    _this.toPackageFoldersPath  = path.resolve(__dirname, '..', 'logs/', 'toPackage/');
                    // Manual Overrides
                    if (options) {
                        for (var prop in options) {
                            _this[prop] = options[prop];
                        }
                    }

                    flow.complete();
                }),
                $task(function(flow) {
                    _this.awsUploader           = new AwsUploader(path.resolve(__dirname, '..') + '/config.json');
                    _this.awsUploader.initialize(function(error) {
                        if (!error) {
                            console.log('awsUploader initialized');
                        } else {
                            console.log('awsUploader failed to initialize');
                        }
                        flow.complete(error);
                    });
                })
            ]).execute(function(error) {
                if (!error) {
                    console.log('PackageAndUploadManager successfully initialized');
                } else {
                    console.log('PackageAndUploadManager failed to initialize');
                }
                callback(error);
            });
        },

         /**
          * @param {string=} directoryName
          * @param {function(error, string)} callback
          */
        'package': function(directoryName, callback) {

            var directoryPath = this.toPackageFoldersPath + '/' + directoryName;
            var inp = fstream.Reader({path: directoryPath, type: 'Directory'});
            var outputFilePath = this.packagedFolderPath + '/' + directoryName + '.tgz';
            var out = fstream.Writer(outputFilePath);

            $task(function(flow) {
                inp.pipe(tar.Pack()).pipe(zlib.createGzip())
                    .on('end', function() {
                        console.log("Packed up directory, '" + directoryPath + "', to " + outputFilePath);
                        flow.complete();
                    })
                    .on('error', function(error) {
                        flow.error(error);
                    })
                    .pipe(out);
            }).execute(function(error) {
                if (callback) {
                    callback(error, outputFilePath);
                }
            });
        },

        /**
         * @param {string} directoryName
         * @param {function(error, string)} callback
         */
        packageAndUpload: function(directoryName, callback) {
            var _this = this;
            this.package(directoryName, function(error, filePath) {
                if (!error) {
                    _this.upload(filePath, function(error) {
                        callback(error, directoryName);
                    });
                } else {
                    console.log(error);
                    callback(error, directoryName);
                }
            });
        },

        /**
         * @param {function(error)} callback
         */
        packageAndUploadEach: function(callback) {
            var _this = this;
            var directoryPath = this.toPackageFoldersPath;
            var callback = callback || function() {};
            $series([
                $task(function(flow) {
                    fs.readdir(directoryPath, function(error, directories) {
                        if (error) {
                            flow.error(error);
                        } else if (directories.length === 0) {
                            console.log('There are no directories package and upload in', directoryPath);
                            flow.complete();
                        } else if (directories.length > 0) {
                            $forEachParallel(directories, function(flow, directory) {
                                _this.packageAndUpload(directory, function(error, directory) {
                                    BugFs.deleteDirectory(path.resolve(directoryPath, directory), true, false, function(error) {
                                        if (!error) {
                                            console.log('Directory', directory, 'successfully removed');
                                        } else {
                                            console.log('Failed to remove directory', directory);
                                        }
                                        flow.complete(error);
                                    });
                                });
                            }).execute(function(error) {
                                if (!error) {
                                    console.log('Successfully packaged and uploaded all available directories in', directoryPath);
                                }
                                flow.complete(error);
                            });
                        }
                    });
                })
            ]).execute(callback);
        },

        /**
         * @param {string} outputFilePath
         * @param {function(error)} callback
         */
        upload: function(outputFilePath, callback) {
            var filePath = new Path(outputFilePath);
            this.awsUploader.upload(outputFilePath, filePath.getName(), null, callback);
        },

        /**
         * @param {string} outputDirectoryPath
         * @param {function(error)} callback
         */
        uploadEach: function(outputDirectoryPath, callback) {
            this.awsUploader.uploadEach(outputDirectoryPath, callback);
        }
    });


    //-------------------------------------------------------------------------------
    // Exports
    //-------------------------------------------------------------------------------

    bugpack.export('sonarbugserver.PackageAndUploadManager', PackageAndUploadManager);
});
