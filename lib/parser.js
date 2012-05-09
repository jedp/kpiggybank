/*
 * parser for change events
 *
 * assumes that these come with a line break between them
 *
 * and look like so:
 *
 * { seq: 931,
 *   id: '271580b628fdc9402cfa2fe1f778991d',
 *   changes: [ { rev: '1-4b995737c825af748aac8593e3b45d7e' } ] }
 * 
 */

var events = require('events');
var util = require('util')

const EOL = '\r\n';
const EOL_LENGTH = EOL.length;

var Parser = module.exports = function Parser() {
  events.EventEmitter.call(this);

  this.buf = "";

  return this;
};
util.inherits(Parser, events.EventEmitter);

Parser.prototype.read = function read(buf) {
  var i;
  var data;

  this.buf += buf.toString('utf8');

  while ((i = this.buf.indexOf(EOL)) > -1) {
    data = this.buf.slice(0, i);
    this.buf = this.buf.slice(i + EOL_LENGTH);

    if (data) {
      try {
        var change = JSON.parse(data);
        // convert strings to integers ...
        ['timestamp', 
          'number_emails', 
          'number_sites_logged_in', 
          'sample_rate'].forEach(function(key) {
            if (typeof change.doc[key] !== 'undefined') {
              change.doc[key] = parseInt(change.doc[key], 10);
            }
          });
        this.emit('change', change);
      } catch(e) {
        console.error(e);
        this.emit('error', data);
      }
    }
  }
};

