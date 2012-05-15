/*
 * Check that for db, there is a document where key===value
 * within the specified interval.  
 *
 * This does an exponential backoff on an (inefficient) temporaryView.
 * The reduce function returns the first matching document, so the caller
 * should expect either a single document to be returned or an error.
 */
module.exports.expectEventually = function expectEventually(key, value, db, interval, callback) {
  value = value.toString();
  function retrieveWithinTime(time) {
    db.view('data/all', {}, function (err, results) {
        // If there was an error (like not_found) or the expected value
        // is not in the result set, try again in a little while.  Back
        // off the time until the interval is exceeded.  If nothing
        // is discovered, callback with an error.
        var found = false;

        if ((!err) && (results.length > 0)) {
          results.forEach(function(result) {
            if (result[key] == value) {
              found = true;
              return callback(null, result);
            }
          });
        } 

        if (time < interval) {
          time *= 2;
          setTimeout(function() {
            retrieveWithinTime(time);
          }, time);
        } else {
          if (!found) return callback(new Error(key + "=" + value + " not found within " + interval + "ms"));
        }
      }
    );
  }
  // start at 1ms and go up exponentially from there
  retrieveWithinTime(1);
}

/*
 * make an example blob of data
 *
 * The completion time is slightly randomized 
 */
module.exports.makeBlob = function makeBlob(timestamp) {
  timestamp = timestamp || (new Date()).getTime();

  return {
    "timestamp": timestamp,
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
      "os": "TestOS",
      "browser": "Foo",
      "version": "42"  
    }
  };
};

