var DI = require('../lib/micro-di-registrator');

function A(options) {
  this.name = 'A';
  this.options = options;
}

function B(options) {
  if (! (this instanceof B)) {
    return new B(options);
  }
  this.name = 'B';
  this.options = options;
}
var di = new DI();

function S(msg) {
  console.log(msg);
}


di.addModules({
  A: A,
  B: B,
  S: S
});

di.addConfig({
  "my": {
    "configData": {
      "key1": "val1",
      "static": {
        '@static': 'S'
      }
    },
    "a": {
      "@class": "A",
      "test": "test1",
      "data": "@my.configData"
    },
    "b": {
      "@factory": "B",
      "a": "@my.a",
      "c": {
        "d": ["1", 2]
      },
      "f": {
        "@class": "A",
        "test": "test3"
      },
      "test": "test2"
    }
  }
});


var c = di.build();
var b = c('my.a');
console.log(b.options);

