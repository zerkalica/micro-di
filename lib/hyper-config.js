var proto;
var traverse = require('traverse');

function escapeRegExp(string){
  return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}


function pathToArray(path) {
  return (path || '').split('.');
}

function merge(acc, val) {
  if (Array.isArray(val)) {
    acc.set(this.path, []);
  } else if (typeof val !== 'object') {
    if (typeof val === 'function') {
      throw new Error('Can\'t add functions to config: ' + this.path.join('.') + ' ' + val.toString());
    }
    acc.set(this.path, val);
  }
  return acc;
}

function normalize(acc, val) {
  var config = acc.config;
  var label = acc.refLabel;
  var regexp = acc.refRegExp;
  var refs = acc.refs;

  function get(path) {
    return config.get(pathToArray(path));
  }
  if (typeof val === 'string') {
    var refPos = val.indexOf(label);
    if (refPos !== -1) {
      var command = val.substring(refPos + 1);
      var lastRefPos = command.lastIndexOf(label);
      if (command === 'disable') {
        this.remove();
      } else if (lastRefPos === -1) {
        this.update(get(command));
        refs[this.path.join('.')] = command;
      } else {
        var result = val.replace(regexp, function replaceMacro(val, path) {
          return get(path);
        }.bind(this));
        this.update(result);
      }
    }
  }
  if (this.key === (label + 'tags')) {
    var path = this.path.slice(0, this.path.length - 1);
    for (var i = 0, j = val.length; i < j; i++) {
      var tag = val[i];
      if (!Array.isArray(acc.tagsPaths[tag])) {
        acc.tagsPaths[tag] = [];
      }
      acc.tagsPaths[tag].push(path);
    }
    this.remove();
  }

  return acc;
}

function checkCircular(val) {
  if (this.circular) {
    throw new Error('circular deps detected: ' + this.path.join('.'));
  }
}

function HyperConfig(options) {
  this.name = 'HyperConfig';
  if (!(this instanceof HyperConfig)) {
    return new HyperConfig(options);
  }
  options = options || {};
  this._refLabel = options.refLabel || '@';
  this._refRegExp = RegExp(escapeRegExp(this._refLabel) + '(.*?)' + escapeRegExp(this._refLabel) , 'g');

  this._config = traverse({});
  this._refs = {};
  this._isBuilded = false;
}
proto = HyperConfig.prototype;

proto.addConfig = function addConfig(config) {
  if (this._isBuilded) {
    throw new Error('Can\'t add config after build');
  }
  traverse(config).reduce(merge, this._config);

  return this;
};

/**
 * Build config
 *
 * @return {Object} tags Config, aggregated by tags
 * @return {Object.<Traverse>} config traverse object of config tree
 */
proto.build = function build() {
  var acc = this._config.reduce(normalize, {
    config: this._config,
    refLabel: this._refLabel,
    refRegExp: this._refRegExp,
    refs: this._refs,
    tagsPaths: {}
  });
  acc.config.forEach(checkCircular);
  this._isBuilded = true;

  return new HyperConfigSession({
    tagsPaths: acc.tagsPaths,
    config: acc.config,
    refs: acc.refs,
    refLabel: acc.refLabel
  });
};

function HyperConfigSession(options) {
  this._refs = options.refs;
  this._tagsPaths = options.tagsPaths;

  var tagsPaths = options.tagsPaths;
  var config = options.config;
  var tags = {};
  for (var tag in tagsPaths) {
    var paths = tagsPaths[tag];
    tags[tag] = [];
    for (var i = 0, j = paths.length; i < j; i++) {
      var path = paths[i];
      tags[tag].push(config.get(path));
    }
  }

  this._config = config;
  this._tags = tags;
}
proto = HyperConfigSession.prototype;

proto.clone = function clone() {
  return new HyperConfigSession({
    config: traverse(this._config.clone()),
    tagsPaths: this._tagsPaths,
    refs: this._refs
  });
};

proto.get = function get(path) {
  return this._config.get(pathToArray(path));
};

proto.getByTag = function getByTag(tag) {
  return Array.isArray(this._tags[tag]) ? this._tags[tag] : [];
};

proto.getRef = function getRef(path) {
  return this._refs[path] ? this._refs[path] : path;
};

module.exports = HyperConfig;
