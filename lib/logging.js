/*
 * Winston logger methods:
 *
 * error
 * warn
 * info
 * debug
 */

var winston = require("winston");
var path = require("path");

// XXX fix me so i work on awsbox and other deploys
var filename = path.join(__dirname, '..', 'kpiggybank.log');

exports.logger = new (winston.Logger)({
  transports: [
    new (winston.transports.File)({
      timestamp: function () { return new Date().toISOString() },
      filename: filename,
      colorize: true,
      handleExceptions: false
    })
  ]
});

