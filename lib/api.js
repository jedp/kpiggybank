var http = require('http');
var qs = require('querystring');

var KPIggyBank = function KPIggyBank(host, port) {
  this.host = host;
  this.port = port;
};

KPIggyBank.prototype.saveData = function saveData(interaction_data, callback) {
  callback = callback || function() {};
  var post_data = qs.stringify(interaction_data);

  var req = http.request(
    {
      host: this.host,
      port: this.port,
      path: '/wsapi/interaction_data',
      method: 'POST',
      headers: {
        'Content-type': 'application/x-www-form-urlencoded',
        'Content-length': post_data.length
      }
    }, 
    function(res) {
      res.on('error', function(err) {
        return callback(err);
      });

      res.on('end', function() {
        return callback(null);
      });
    });

  // without an error handler, this would crash if the 
  // service were unavailable
  req.on("error", function(err) {
    return callback(err);
  });

  req.write(post_data);
  req.end();
};

module.exports = KPIggyBank;
