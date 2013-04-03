// -------------------------------------------------------------------------------
// Requires
// -------------------------------------------------------------------------------

//@Package('sonarbug')

//@Export('PackageAndUploadManager')

//@Require('aws.AwsConfig')
//@Require('bugboil.BugBoil')
//@Require('bugflow.BugFlow')
//@Require('bugfs.BugFs')
//@Require('Class')
//@Require('Obj')
//@Require('bugfs.Path')
//@Require('aws.S3Api')
//@Require('aws.S3Bucket')

// -------------------------------------------------------------------------------
// Common Modules
// -------------------------------------------------------------------------------

var AWS         = require('aws-sdk');
var bugpack     = require('bugpack').context(module);
var fs          = require('fs');
var fstream     = require("fstream");
var path        = require("path");
var tar         = require('tar');
var zlib        = require('zlib');

// -------------------------------------------------------------------------------
// Bugpack
// -------------------------------------------------------------------------------

var AwsConfig   = bugpack.require('aws.AwsConfig');
var BugBoil     = bugpack.require('bugboil.BugBoil');
var BugFlow     = bugpack.require('bugflow.BugFlow');
var BugFs       = bugpack.require('bugfs.BugFs');
var Class       = bugpack.require('Class');
var Obj         = bugpack.require('Obj');
var Path        = bugpack.require('bugfs.Path');
var S3Api       = bugpack.require('aws.S3Api');
var S3Bucket    = bugpack.require('aws.S3Bucket');

//-------------------------------------------------------------------------------
// Simplify References
//-------------------------------------------------------------------------------
var $if                 = BugFlow.$if;
var $foreachParallel    = BugBoil.$foreachParallel;
var $series             = BugFlow.$series;
var $task               = BugFlow.$task;

// -------------------------------------------------------------------------------
// Declare Class
// -------------------------------------------------------------------------------

var PackageAndUploadManager = Class.extend(Obj, {
    
    /**
     * @param {{
     *  props: {
     *      awsConfig: {
     *          accessKeyId: string,
     *          region: string,
     *          secretAccessKey: string
     *      },
     *      sourcePaths: Array.<string>,
     *      local-bucket: string,
     *      bucket: string,
     *      options: {*}
     *  },
     *  packagedFolderPath: string
     *  toPackageFoldersPath: string,
     * }=} options
     */
    _constructor: function(options){
        this.isBucketEnsured        = false;
        this.props                  = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..') + '/buildbug.json'));
        this.packagedFolderPath     = path.resolve(__dirname, '..', 'logs/', 'packaged/');
        this.toPackageFoldersPath   = path.resolve(__dirname, '..', 'logs/', 'toPackage/');
        
        //TODO: allow for overriding of defaults using the options param
        //TODO: ensureBucket as part of initialization
        
        $task(function(flow){
            _this.s3EnsureBucket(function(error){ 
                flow.complete(error);
            });
        }).execute(function(error){
            
        });

    },

    // -------------------------------------------------------------------------------
    // Public Static Methods
    // -------------------------------------------------------------------------------

     /**
      * @param {string=} directoryName
      * @param {function(error, string)} callback
      */
    package: function(directoryName, callback){         
        if(directoryName === 'function' && callback == null){
            var callback = directoryName;
            var directoryName = "";
        }
        var _this = this;
        var directoryPath = this.toPackageFoldersPath + '/' + directoryName;
        var inp = fstream.Reader({path: directoryPath, type: "Directory"});
        var outputFilePath = this.packagedFolderPath + '/' + directoryName + '.tgz';
        var out = fstream.Writer(outputFilePath);

        $task(function(flow){
            inp.pipe(tar.Pack()).pipe(zlib.createGzip())
                .on('end', function(){
                    console.log("Packed up directory, '" + directoryPath + "', to " + outputFilePath);
                    flow.complete();
                })
                .on('error', function(error){
                    flow.complete(error);
                })
                .pipe(out);
        }).execute(function(error){
            if(callback){
                callback(error, outputFilePath);
            }
        })
    },

    packageAndUpload: function(directoryName, callback){        
        var _this = this;
        this.package(directoryName, function(error, filePath){
            if(!error){
                _this.upload(filePath, function(error){
                    callback(error, directoryName);
                });
            } else {
                console.log(error);
                callback(error, directoryName);
            }
        });
    },

    packageAndUploadEach: function(callback){        
        var _this = this;
        var directoryPath = this.toPackageFoldersPath;
        var callback = callback || function(){};
        $series([
            $task(function(flow){
                if(!_this.isBucketEnsured){
                    _this.s3EnsureBucket(function(error){
                        if(!error){
                            _this.isBucketEnsured = true;
                            console.log("Bucket Ensured");
                        }
                        flow.complete(error);
                    });
                }
            }),
            $task(function(flow){
                fs.readdir(directoryPath, function(error, directories){
                    if(!error){
                        $foreachParallel(directories, function(boil, directory){
                            _this.packageAndUpload(directory, function(error, directory){
                                BugFs.deleteDirectory(path.resolve(directoryPath, directory), true, false, function(error){
                                    if(!error){
                                        console.log("Directory", directory, "successfully removed");
                                    } else {
                                        console.log("Failed to remove directory", directory);
                                        console.log(error);
                                    }
                                    boil.bubble(error);
                                });
                            });
                        }).execute(function(error){
                            if(!error){
                                console.log("Successfully packaged and uploaded each directory in", directoryPath);
                            } else {
                                console.log(error);
                            }
                            flow.complete(error);
                        });
                    } else {
                        console.log(error);
                    }
                });
            })
        ]).execute(callback);
    },

    // packageAndUploadAll: function(callback){
    //     var directoryName = "batch";
    //     this.packageAndUpload(directoryName, callback);
    // },

    upload: function(outputFilePath, callback){
        this.s3PutFile(outputFilePath, function(error){
            callback(error);
        });
    },

    //-------------------------------------------------------------------------------
    // Private Static Methods
    //-------------------------------------------------------------------------------

    /**
     * @private
     * @param {function(Error)} callback
     */
    s3EnsureBucket: function(callback) {
       var props = this.props;
       var awsConfig = new AwsConfig(props.awsConfig);
       var s3Bucket = new S3Bucket({
           name: props.bucket || props["local-bucket"]
       });
       var s3Api = new S3Api(awsConfig);
       s3Api.ensureBucket(s3Bucket, function(error) {
           var bucketName = s3Bucket.getName();
           if (!error) {
               console.log("Ensured bucket '" + bucketName + "' exists");
               callback(null, bucketName);
           } else {
               callback(error, bucketName);
           }
       });
    },

    /**
     * @private
     * @param {string} file
     * @param {function(Error)} callback
     */
    s3PutFile: function(file, callback) {
        var props = this.props;
        var awsConfig = new AwsConfig(props.awsConfig);
        var filePath = new Path(file);
        var s3Bucket = new S3Bucket({
            name: props.bucket || props["local-bucket"]
        });
        var options = props.options || {acl: ''}; // Test this change
        var s3Api = new S3Api(awsConfig);

        $if (function(flow) {
               filePath.exists(function(exists) {
                   flow.assert(exists);
               });
           },
           $task(function(flow) {
               s3Api.putFile(filePath, s3Bucket, options, function(error, s3Object) {
                   if (!error) {
                       console.log("Successfully uploaded file to S3 '" + s3Api.getObjectURL(s3Object, s3Bucket) + "'");
                       // _this.registerURL(filePath, s3Api.getObjectURL(s3Object, s3Bucket));
                       flow.complete();
                   } else {
                       console.log("s3Api.putFile Error");
                       flow.error(error);
                   }
               });
           })
       ).$else(
           $task(function(flow) {
               flow.error(new Error("Cannot find file '" + filePath.getAbsolutePath() + "'"));
           })
       ).execute(callback);
   }
});


// -------------------------------------------------------------------------------
// Exports
// -------------------------------------------------------------------------------

bugpack.export('sonarbug.PackageAndUploadManager', PackageAndUploadManager);
