'use strict';

require('console.table');

var util = require('../lib/util');
var configTool = require('../config');
var con = require('../lib/console');
var moment = require('moment');
var BBPromise = require('bluebird');
var request = require('request');
var ProgressBar = require('progress');
var fs = require('fs');
var _ = require('lodash');


/*
██████  ██    ██ ███████ ██   ██     ██████  ██    ██ ██ ██      ██████
██   ██ ██    ██ ██      ██   ██     ██   ██ ██    ██ ██ ██      ██   ██
██████  ██    ██ ███████ ███████     ██████  ██    ██ ██ ██      ██   ██
██      ██    ██      ██ ██   ██     ██   ██ ██    ██ ██ ██      ██   ██
██       ██████  ███████ ██   ██     ██████   ██████  ██ ███████ ██████
*/

// copy down build from teamcity, upload to dev, update info.json
function pushBuild(verbose){
  var config = configTool.get();
  var localFilePath = config.remoteBuild.localBuildFile;
  var env = _getSortEnviroments()[0];
  var s3FileName = env.dir + "/" + config.buildFileName;
  var uploadedSize;

  return _downloadRemoteBuild(verbose)
  .then(function(){
    return util.copyLocalFileToS3UsingPromise(localFilePath, config.bucket, s3FileName, verbose);
  })
  .then(function(data){
    return util.headObjectUsingPromise(config.bucket,s3FileName)
    .then(function(obj){
      uploadedSize = obj.ContentLength;
      return data;
    });
  })
  .then(function(){
    var stats = fs.statSync(localFilePath);
    var downloadedSize = stats.size;
    if(downloadedSize != uploadedSize){
      con.blank();
      con.errorLoud('** ERROR **');
      con.error('Download size and upload size do not match.');
      con.error('  download size: ' + downloadedSize);
      con.error('  upload size:   ' + uploadedSize);
    }else{
      con.success('Push complete - build size: ' + uploadedSize);
    }
  })
  .then(function(data){
    return updateInfoJson({env:env, size: uploadedSize});
  });

}




/*
██████  ██    ██ ███████ ██   ██     ██       ██████   ██████  █████  ██          ██████  ██    ██ ██ ██      ██████
██   ██ ██    ██ ██      ██   ██     ██      ██    ██ ██      ██   ██ ██          ██   ██ ██    ██ ██ ██      ██   ██
██████  ██    ██ ███████ ███████     ██      ██    ██ ██      ███████ ██          ██████  ██    ██ ██ ██      ██   ██
██      ██    ██      ██ ██   ██     ██      ██    ██ ██      ██   ██ ██          ██   ██ ██    ██ ██ ██      ██   ██
██       ██████  ███████ ██   ██     ███████  ██████   ██████ ██   ██ ███████     ██████   ██████  ██ ███████ ██████
*/

// upload local build to lowest ordered environment (dev), update info.json
function pushLocalBuild(verbose){
  var config = configTool.get();
  var localFilePath = config.localBuildFile;
  var env = _getSortEnviroments()[0];
  var s3FileName = env.dir + "/" + config.buildFileName;

  return util.copyLocalFileToS3UsingPromise(localFilePath, config.bucket, s3FileName, verbose)
  .then(function(data){
    return util.headObjectUsingPromise(config.bucket,s3FileName)
    .then(function(obj){
      return updateInfoJson({env:env, size: obj.ContentLength});
    });
  });

}




/*
██████  ██████   ██████  ███    ███  ██████  ████████ ███████
██   ██ ██   ██ ██    ██ ████  ████ ██    ██    ██    ██
██████  ██████  ██    ██ ██ ████ ██ ██    ██    ██    █████
██      ██   ██ ██    ██ ██  ██  ██ ██    ██    ██    ██
██      ██   ██  ██████  ██      ██  ██████     ██    ███████
*/

function promote(env, version, verbose){
  var config = configTool.get();

  return new Promise(function(resolve, reject) {

    // check that the env arg and config is all good
    var envToPromote = config.environments[env];
    if(envToPromote){
      if(envToPromote.promotesTo){
        var promotesTo = config.environments[envToPromote.promotesTo];
        if(promotesTo){
          if(promotesTo.archiveOnPromote && !version){
            reject(new Error('A version must be specified since the "'+promotesTo.key+'" environment has "archive on promote" set to true.'));
          }else{
            resolve({srcEnv:envToPromote, destEnv:promotesTo, version:version});
          }
        }else{
          reject(new Error('Can not promote "'+env+'" to "'+envToPromote.promotesTo+'" because "'+envToPromote.promotesTo+'" does not exist in the configuration.'));
        }
      }else{
        reject(new Error('Environment "'+env+'" is not configured to promote to another environment.'));
      }
    }else{
      reject(new Error('Environment "'+env+'" does not exist in the configuration.'));
    }

  })
  .then(function(data){
    var srcPath = data.srcEnv.dir + '/' + config.buildFileName;
    var srcInfoFile = data.srcEnv.dir + '/' + config.infoFile;
    var destPath = data.destEnv.dir + '/' + config.buildFileName;
    var version = data.version;

    // copy build from src to dest
    return util.copyS3FileToS3UsingPromise(srcPath, destPath, config.bucket, verbose)
    .then(function(){
      // get the existing src info json file
      return util.getJsonObjectUsingPromise(config.bucket, srcInfoFile);
    })
    .then(function(info){
      // archive if dest env has archiveOnPromote set to true
      if(data.destEnv.archiveOnPromote){
        //Build-v1.2.1-20160405.144261.war
        var arch = config.archive;
        var archivePath = arch.dir + '/' + arch.prefix + version +'-'+ info.build + arch.suffix;
        return util.copyS3FileToS3UsingPromise(srcPath, archivePath, config.bucket, verbose)
        .then(function(){
          return info;
        });
      }
      return info;
    })
    .then(function(info){
      // update the dest info json file
      var ver = '';
      if(version){
        ver = version;
      }

      return util.headObjectUsingPromise(config.bucket,destPath)
      .then(function(obj){
        return updateInfoJson({env:data.destEnv, build: info.build, version: ver, size: obj.ContentLength});
      });

    });

  });

}




/*
 ██████  ███████ ████████     ██ ███    ██ ███████  ██████      ██████  ███████ ██████   ██████  ██████  ████████
██       ██         ██        ██ ████   ██ ██      ██    ██     ██   ██ ██      ██   ██ ██    ██ ██   ██    ██
██   ███ █████      ██        ██ ██ ██  ██ █████   ██    ██     ██████  █████   ██████  ██    ██ ██████     ██
██    ██ ██         ██        ██ ██  ██ ██ ██      ██    ██     ██   ██ ██      ██      ██    ██ ██   ██    ██
 ██████  ███████    ██        ██ ██   ████ ██       ██████      ██   ██ ███████ ██       ██████  ██   ██    ██
*/

function getInfoReport(){
  var config = configTool.get();

  return new Promise(function(resolve, reject) {

    // build up list of promise requests
    var requests = [];
    var envs = _getSortEnviroments();
    for(let i=0; i<envs.length; i++){
      requests.push(util.getJsonObjectUsingPromise(config.bucket, envs[i].dir + '/' + config.infoFile));
    }

    // call them all and wait for all to return
    BBPromise.all(requests)
    .then(function(data) {
        var report = [];

        for(let i=0; i<envs.length; i++){
          var env = envs[i];
          var info = _(data).find('env',env.key);
          env.info = info || {};
          report.push(env);
        }

        resolve(report);
    });

  });

}




/*
 ██████  ██████  ███    ██ ███████  ██████  ██      ███████     ██ ███    ██ ███████  ██████      ██████  ███████ ██████   ██████  ██████  ████████
██      ██    ██ ████   ██ ██      ██    ██ ██      ██          ██ ████   ██ ██      ██    ██     ██   ██ ██      ██   ██ ██    ██ ██   ██    ██
██      ██    ██ ██ ██  ██ ███████ ██    ██ ██      █████       ██ ██ ██  ██ █████   ██    ██     ██████  █████   ██████  ██    ██ ██████     ██
██      ██    ██ ██  ██ ██      ██ ██    ██ ██      ██          ██ ██  ██ ██ ██      ██    ██     ██   ██ ██      ██      ██    ██ ██   ██    ██
 ██████  ██████  ██   ████ ███████  ██████  ███████ ███████     ██ ██   ████ ██       ██████      ██   ██ ███████ ██       ██████  ██   ██    ██
*/

function consoleInfoReport(){

    return getInfoReport()
    .then(function(report){

      var table = [];

      for(let i=0; i<report.length; i++){
        var r = report[i];
        var row = {};
        row.Environment = r.label;
        row.Date = r.info.date || '--';
        row.Build = r.info.build || '--';
        row.Size = r.info.size || '--';
        row.Version = r.info.version || '--';

        table.push(row);
      }

      console.log(' ');
      console.table(table);

      return report;
    });
}




/*
██    ██ ██████  ██████   █████  ████████ ███████     ██ ███    ██ ███████  ██████           ██ ███████  ██████  ███    ██
██    ██ ██   ██ ██   ██ ██   ██    ██    ██          ██ ████   ██ ██      ██    ██          ██ ██      ██    ██ ████   ██
██    ██ ██████  ██   ██ ███████    ██    █████       ██ ██ ██  ██ █████   ██    ██          ██ ███████ ██    ██ ██ ██  ██
██    ██ ██      ██   ██ ██   ██    ██    ██          ██ ██  ██ ██ ██      ██    ██     ██   ██      ██ ██    ██ ██  ██ ██
 ██████  ██      ██████  ██   ██    ██    ███████     ██ ██   ████ ██       ██████       █████  ███████  ██████  ██   ████
*/

function updateInfoJson(data){
  var env = data.env;
  var build = data.build;
  var version = data.version;
  var size = data.size;
  var config = configTool.get();

  var s3File = env.dir + "/" + config.infoFile;

  var json = {};
  json.env = env.key;
  json.label = env.label;
  json.date = moment().format('MM/DD/YYYY h:mm:ss a');
  if(build){
    json.build = build;
  }else{
    json.build = moment().format('YYYYMMDD.HHmmss');
  }
  if(version){
    json.version = version;
  }
  if(size){
    json.size = size;
  }

  return util.putJsonObjectUsingPromise(json, config.bucket, s3File);
}




/*
██████   ██████  ██     ██ ███    ██ ██       ██████   █████  ██████      ██████  ███████ ███    ███  ██████  ████████ ███████     ██████  ██    ██ ██ ██      ██████
██   ██ ██    ██ ██     ██ ████   ██ ██      ██    ██ ██   ██ ██   ██     ██   ██ ██      ████  ████ ██    ██    ██    ██          ██   ██ ██    ██ ██ ██      ██   ██
██   ██ ██    ██ ██  █  ██ ██ ██  ██ ██      ██    ██ ███████ ██   ██     ██████  █████   ██ ████ ██ ██    ██    ██    █████       ██████  ██    ██ ██ ██      ██   ██
██   ██ ██    ██ ██ ███ ██ ██  ██ ██ ██      ██    ██ ██   ██ ██   ██     ██   ██ ██      ██  ██  ██ ██    ██    ██    ██          ██   ██ ██    ██ ██ ██      ██   ██
██████   ██████   ███ ███  ██   ████ ███████  ██████  ██   ██ ██████      ██   ██ ███████ ██      ██  ██████     ██    ███████     ██████   ██████  ██ ███████ ██████
*/

function _downloadRemoteBuild(verbose){
  var config = configTool.get();

  return new Promise(function(resolve, reject) {
    var rb = config.remoteBuild;

    var params = {
      'auth': {
        'user': rb.user,
        'pass': rb.pass,
        'sendImmediately': false
      }
    };

    if(verbose){
      con.info("Downloading remote build from " + rb.url);
    }

    request(rb.url, params)
    .on('response', function(response){

      var contentType = response.headers['content-type'];
      var contentLength = parseInt(response.headers['content-length'], 10);

      var commonErrHelp = '(VPN?, Credentials?, URL?)';
      if(response.statusCode != 200){
        reject(new Error('Status code: ' + response.statusCode + '. Download failed. ' + commonErrHelp));
      }
      if(contentLength < 1024){
        reject(new Error("Content length is very small, that can't be right. Download failed. " + commonErrHelp));
      }
      if(_.startsWith(contentType, 'text/')){
        reject(new Error('Invalid content type: ' + contentType + '. Build content is not text. Download failed. ' + commonErrHelp));
      }

      if(contentLength > 1024){
        var progressBar = new ProgressBar('  downloading [:bar] :percent :etas', {
          complete: '=',
          incomplete: ' ',
          width: 50,
          total: contentLength
        });

        response.on("data", function(chunk) {
          progressBar.tick(chunk.length);
        });
      }

    })
    //.on('end', resolve)
    .on('error', function(err){
      reject(err);
    })
    .pipe(
      fs.createWriteStream(rb.localBuildFile)
      .on('finish', resolve)
    );
  });

}




/*
 ██████  ███████ ████████     ███████  ██████  ██████  ████████     ███████ ███    ██ ██    ██ ██ ██████   ██████  ███    ██ ███    ███ ███████ ███    ██ ████████ ███████
██       ██         ██        ██      ██    ██ ██   ██    ██        ██      ████   ██ ██    ██ ██ ██   ██ ██    ██ ████   ██ ████  ████ ██      ████   ██    ██    ██
██   ███ █████      ██        ███████ ██    ██ ██████     ██        █████   ██ ██  ██ ██    ██ ██ ██████  ██    ██ ██ ██  ██ ██ ████ ██ █████   ██ ██  ██    ██    ███████
██    ██ ██         ██             ██ ██    ██ ██   ██    ██        ██      ██  ██ ██  ██  ██  ██ ██   ██ ██    ██ ██  ██ ██ ██  ██  ██ ██      ██  ██ ██    ██         ██
 ██████  ███████    ██        ███████  ██████  ██   ██    ██        ███████ ██   ████   ████   ██ ██   ██  ██████  ██   ████ ██      ██ ███████ ██   ████    ██    ███████
*/

function _getSortEnviroments(){
  var config = configTool.get();
  var envs = _.sortBy(config.environments, function(o) { return o.order; });
  return envs;
}




module.exports = {
  pushBuild: pushBuild,
  pushLocalBuild: pushLocalBuild,
  promote: promote,
  getInfoReport: getInfoReport,
  consoleInfoReport: consoleInfoReport
};
