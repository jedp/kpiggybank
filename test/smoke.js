var vows = require("vows");
var assert = require("assert");

vows.describe("Smoke test")

.addBatch({
  "Test suites": {
    topic: 42, 

    "are functional": function(meaning) { 
      assert(meaning === 42);
    }
  }
})

.export(module);
