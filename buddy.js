#!/usr/bin/env node

'use strict';

var config = require('./config');
var util = require('./lib/util');
var service = require('./lib/service');
var con = require('./lib/console');
var pkginfo = require('pkginfo')(module, 'version');
var program = require('commander');
var version = module.exports.version;

var cmdValue;

program._name = 'buddy';

var desc = [];
desc.push('AWS Buddy Commands:\n');
desc.push('\n');
desc.push('    push               :  download remote build & upload to first environment (dev)\n');
desc.push('    push-local         :  upload local build to first environment (dev)\n');
desc.push('    promote            :  copies specified env build to configured promotesTo env.\n');
desc.push('                          may also archive based on configuration. \n');
desc.push('                          --env is required, --ver may be required \n');
desc.push('                          example: buddy promote --env stage --ver 1.16.1\n');
desc.push('    info               :  list the current status of each environment\n');
desc.push('    bucket             :  list the contents of the configured bucket');

program
  .version(version)
  .usage('<cmd> [options]')
  .arguments('<cmd>')
  .description(desc.join(''))
  .option('-e, --env <env>', 'environment to use. dev, stage, etc.')
  .option('-v, --ver <ver>', 'version to use. v1.2.0, etc')
  .action(function (cmd) {
     cmdValue = cmd;
  });



program.parse(process.argv);

if (typeof cmdValue === 'undefined') {
   console.log('');
   console.error('  You must provide a command!');
   program.help();
   process.exit(1);
}



function promote(){

  var promoteUsage = function(){
    console.log('  Example:');
    console.log('    buddy promote --env dev');
    console.log('    buddy promote --env stage --ver v1.2.0');
    console.log(' ');
  };

  if(!(program.env)){
    con.blank();
    con.error('  You must specify an environment argument');
    promoteUsage();
    //program.help();
    return;
  }

  var env = program.env;
  var version;
  if(program.ver){
    version = program.ver;
  }

  service.promote(env, version, true)
  .then(function(){
    con.success('Promotion of "'+env+'" has completed successfully');
  })
  .catch(function(err){
    con.errorMsg(err);
    promoteUsage();
    //console.log('STACK',err.stack);
  });
}



function catchAndLogError(promise){
  promise
  .catch(function(err){
    con.errorMsg(err);
    process.exit(1);
  });
}



switch(cmdValue) {
    case 'bucket':
        catchAndLogError(util.showBucketUsingPromise(config.bucket));
        break;
    case 'push':
        catchAndLogError(service.pushBuild(true));
        break;
    case 'push-local':
        catchAndLogError(service.pushLocalBuild(true));
        break;
    case 'promote':
        promote();
        break;
    case 'info':
        catchAndLogError(service.consoleInfoReport());
        break;
    default:
        con.blank();
        con.error('  Invalid command!    "' + cmdValue + '" is not a valid command');
        program.help();
        process.exit(1);
}
