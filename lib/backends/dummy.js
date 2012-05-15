/*
 * dummy db - just logs to console
 */

var getRandomBlob = function() {
  return {
    "timestamp": (new Date()).getTime(),
    "event_stream": [
         [ "picker", 732 ],
         [ "picker::change", 1700 ],
         [ "picker::signin", 2300 ],
         [ "assertion_generation", 2500 ],
         [ "certified", 3300 ],
         [ "assertion_generated", 4500 ],
         [ "complete", parseInt((Math.random() * 300 + 4500).toFixed(), 10) ]
    ],
    "email_type": "secondary",
    "number_emails": 3,
    "new_account": false,
    "language": "en_US",
    "number_sites_logged_in": 1,
    "screen_size": { "width": 640, "height": 480 },
    "sample_rate": 1.0,
     "user_agent": {
      "os": "FooOS",
      "browser": "PDQ",
      "version": "6.18"  
    }
  };
};

var Backend = function Backend(message, config, callback) {
  this.message = message;
  return this;
}

Backend.prototype.save = function save(data, callback) {
  return callback(null);
}

Backend.prototype.count = function count(callback) {
  return callback(null, 42);
}

Backend.prototype.fetchRange = function fetchRange(options, callback) {
  if (arguments.length < 2) {
    callback = options;
    options = {};
  }
  return callback(null, [ getRandomBlob() ]);
};

Backend.prototype.exists = function exists(callback) {
  return callback(null, true);
};

Backend.prototype.destroy = function destroy(callback) {
  return callback(new Error("Dummy DB can't be destroyed."));
};

module.exports = Backend;

