'use strict';

var fs = require('fs');
var jsonfile = require('jsonfile');
jsonfile.spaces = 4;


var defaultConfig = {
  awsRegion: 'us-east-1',
  bucket: '',
  buildFileName: '',
  localBuildFile: '',
  infoFile: 'info.json',
  archive: {
    dir: 'build/archive',
    prefix: 'Build-',
    suffix: '.war'
  },
  remoteBuild: {
    url: '',
    user:'',
    pass:'',
    localBuildFile: ''
  },
  environments: {
    prod: {
      label: 'Production',
      key: 'prod',
      order: 3,
      dir: 'build/env/prod',
      promotesTo: false,
      archiveOnPromote: true
    },
    stage: {
      label: 'Stage',
      key: 'stage',
      order: 2,
      dir: 'build/env/stage',
      promotesTo: 'prod',
      archiveOnPromote: false
    },
    dev: {
      label: 'Development',
      key: 'dev',
      order: 1,
      dir: 'build/env/dev',
      promotesTo: 'stage',
      archiveOnPromote: false
    }
  }
};

// read the config from the user dir, it doesn't exist create it form the defaultConfig
var homeDir = (process.platform == 'win32'? process.env.USERPROFILE: process.env.HOME);
var userConfigFile = homeDir + '/.aws-buddy.json';

var userConfig = defaultConfig;
try{
  userConfig = jsonfile.readFileSync(userConfigFile);
}catch(err){
  jsonfile.writeFileSync(userConfigFile, defaultConfig);
}

module.exports = userConfig;
