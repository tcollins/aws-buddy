'use strict';

var chalk = require('chalk');

var err = chalk.bold.red;
var errLoud = chalk.bold.bgRed.white;
var succ = chalk.bold.green;
var inf = chalk.bold.blue;

function log(s){
  console.log(s);
}

function blank(){
  console.log('');
}

function info(s){
  console.log(inf(s));
}

function success(s){
  console.log(succ(s));
}

function error(s){
  console.log(err(s));
}

function errorLoud(s){
  console.log(errLoud(s));
}

function errorMsg(err){
  blank();
  errorLoud('** ERROR **');
  error(err.message);
  blank();
}

module.exports = {
  log: log,
  blank: blank,
  info: info,
  success: success,
  error: error,
  errorLoud: errorLoud,
  errorMsg: errorMsg
};
