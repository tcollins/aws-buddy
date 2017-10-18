'use strict';

var configTool = require('../config');
var con = require('../lib/console');
var fs = require('fs');
var BBPromise = require('bluebird');
var stringify = require('json-stringify');
var ProgressBar = require('progress');



function s3(){
  var config = configTool.get();
  var AWS = require('aws-sdk');
  AWS.config.region = config.awsRegion;

  if(config.awsProfile){
    AWS.config.credentials = new AWS.SharedIniFileCredentials({profile: config.awsProfile});
  }

  // the s3 client with promise support
  return new BBPromise.promisifyAll(new AWS.S3(), {suffix: 'UsingPromise'});
}


/*
███████ ██   ██  ██████  ██     ██     ██████  ██    ██  ██████ ██   ██ ███████ ████████
██      ██   ██ ██    ██ ██     ██     ██   ██ ██    ██ ██      ██  ██  ██         ██
███████ ███████ ██    ██ ██  █  ██     ██████  ██    ██ ██      █████   █████      ██
     ██ ██   ██ ██    ██ ██ ███ ██     ██   ██ ██    ██ ██      ██  ██  ██         ██
███████ ██   ██  ██████   ███ ███      ██████   ██████   ██████ ██   ██ ███████    ██
*/

function showBucketUsingPromise(bucket){
  return s3().listObjectsUsingPromise({Bucket:bucket})
  .then(function(data){
    console.log('====== S3 bucket: ' + bucket + ' ======');
    var contents = data.Contents;
    for(var i=0; i<contents.length; i++){
      console.log(contents[i].Key);
    }
  });

}




/*
 ██████  ██████  ██████  ██    ██     ██       ██████   ██████  █████  ██          ████████  ██████      ███████ ██████
██      ██    ██ ██   ██  ██  ██      ██      ██    ██ ██      ██   ██ ██             ██    ██    ██     ██           ██
██      ██    ██ ██████    ████       ██      ██    ██ ██      ███████ ██             ██    ██    ██     ███████  █████
██      ██    ██ ██         ██        ██      ██    ██ ██      ██   ██ ██             ██    ██    ██          ██      ██
 ██████  ██████  ██         ██        ███████  ██████   ██████ ██   ██ ███████        ██     ██████      ███████ ██████
*/

function copyLocalFileToS3UsingPromise(localFilePath, bucket, s3FileName, verbose){

  var fileContent = fs.createReadStream(localFilePath);

  var params = {
    Bucket: bucket,
    Key: s3FileName,
    Body: fileContent
  };

  return new Promise(function(resolve, reject) {

    if(verbose){
      con.info('Uploading ' + localFilePath + ' to S3 ' + bucket + ':' + s3FileName);
    }

    var req = s3().putObject(params, function(err, data) {
      if(err){
        reject(err);
      }else{
        resolve(data);
      }
    });

    if(verbose){
      var progressBar = new ProgressBar('  uploading   [:bar] :percent :etas', {
        complete: '=',
        incomplete: ' ',
        width: 50,
        total: 100
      });

      req.on('httpUploadProgress',function(progress) {
         var percent = progress.loaded/progress.total;
         progressBar.update(percent);
      });
    }

  })
  .then(function(data){
    return {data: data, localFilePath: localFilePath, key:s3FileName ,bucket:bucket};
  });

}




/*
 ██████  ██████  ██████  ██    ██     ███████ ██████      ████████  ██████      ███████ ██████
██      ██    ██ ██   ██  ██  ██      ██           ██        ██    ██    ██     ██           ██
██      ██    ██ ██████    ████       ███████  █████         ██    ██    ██     ███████  █████
██      ██    ██ ██         ██             ██      ██        ██    ██    ██          ██      ██
 ██████  ██████  ██         ██        ███████ ██████         ██     ██████      ███████ ██████
*/

function copyS3FileToS3UsingPromise(srcPath, destPath, bucket, verbose){

  var params = {
    Bucket: bucket,
    Key: destPath,
    CopySource: bucket + '/' + srcPath
  };

  return s3().copyObjectUsingPromise(params)
  .then(function(data){
    if(verbose){
      con.success('Successful S3 copy of ' + srcPath + ' to ' + destPath + ' in bucket ' + bucket);
    }
    return {data: data, srcPath: srcPath, destPath:destPath ,bucket:bucket};
  });

}




/*
██████  ██    ██ ████████          ██ ███████  ██████  ███    ██      ██████  ██████       ██ ███████  ██████ ████████
██   ██ ██    ██    ██             ██ ██      ██    ██ ████   ██     ██    ██ ██   ██      ██ ██      ██         ██
██████  ██    ██    ██             ██ ███████ ██    ██ ██ ██  ██     ██    ██ ██████       ██ █████   ██         ██
██      ██    ██    ██        ██   ██      ██ ██    ██ ██  ██ ██     ██    ██ ██   ██ ██   ██ ██      ██         ██
██       ██████     ██         █████  ███████  ██████  ██   ████      ██████  ██████   █████  ███████  ██████    ██
*/

function putJsonObjectUsingPromise(jsonObj, bucket, s3FileName, verbose){

  var fileContent = stringify(jsonObj);

  var params = {
    Bucket: bucket,
    Key: s3FileName,
    Body: fileContent
  };

  return s3().putObjectUsingPromise(params)
  .then(function(data){
    if(verbose){
      con.success('Successful upload of json obj to S3 ' + bucket + ':' + s3FileName);
    }
    return {data: data, jsonObj:jsonObj, key:s3FileName ,bucket:bucket};
  });

}




/*
 ██████  ███████ ████████          ██ ███████  ██████  ███    ██      ██████  ██████       ██ ███████  ██████ ████████
██       ██         ██             ██ ██      ██    ██ ████   ██     ██    ██ ██   ██      ██ ██      ██         ██
██   ███ █████      ██             ██ ███████ ██    ██ ██ ██  ██     ██    ██ ██████       ██ █████   ██         ██
██    ██ ██         ██        ██   ██      ██ ██    ██ ██  ██ ██     ██    ██ ██   ██ ██   ██ ██      ██         ██
 ██████  ███████    ██         █████  ███████  ██████  ██   ████      ██████  ██████   █████  ███████  ██████    ██
*/

function getJsonObjectUsingPromise(bucket, s3FileName){

  var params = {
    Bucket: bucket,
    Key: s3FileName
  };

  return s3().getObjectUsingPromise(params)
  .then(function(data){
    var json = JSON.parse(data.Body.toString());
    return json;
  })
  .catch(function(err){
    return {};
  });

}


function headObjectUsingPromise(bucket, s3FileName){

  var params = {
    Bucket: bucket,
    Key: s3FileName
  };

  return s3().headObjectUsingPromise(params);

}




module.exports = {
  showBucketUsingPromise: showBucketUsingPromise,
  copyLocalFileToS3UsingPromise: copyLocalFileToS3UsingPromise,
  copyS3FileToS3UsingPromise: copyS3FileToS3UsingPromise,
  putJsonObjectUsingPromise: putJsonObjectUsingPromise,
  getJsonObjectUsingPromise: getJsonObjectUsingPromise,
  headObjectUsingPromise: headObjectUsingPromise
};
