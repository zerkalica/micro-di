var proto,
	traverse = require('traverse');

function isService(params) {
	return params['@class'] || params['@factory'] || params['@static'];
}

function pathToArray(path) {
  return (path || '').split('.');
}

/**
 * Micro di
 *
 * @param {Object} options Options
 * @param {String} options.separator Variables separator
 * @param {Object} options.modules registered classes hash-map
 * @param {Object} options.config di config json
 */
function MicroDiContainer(options) {
	this.name = 'MicroDiContainer';
	if (!(this instanceof MicroDiContainer)) {
		return new MicroDiContainer(options);
	}
	options = options || {};
	this._cache     = {};
	this._config    = options.config.clone();
	this._modules   = traverse(options.modules || {});
}
proto = MicroDiContainer.prototype;

proto._getService = function _getService(params, paramsPath) {
	var service;
	var path = params['@class'] || params['@factory'] || params['@static'];
	if (!path) {
		throw new Error('This is not a service');
	}
	var isFactory = !!params['@factory'];
	var isStatic = !!params['@static'];

	delete params['@class'];
	delete params['@factory'];
	delete params['@static'];
	var Service = this._modules.get(pathToArray(path));
	if (!Service) {
		throw new Error('Service ' + path + ' not found');
	}
	var args = this._convertPropertyValue(params, paramsPath);
	service = isFactory ? Service(args) : (isStatic ? Service : new Service(args));

	return service;
};

proto._convertPropertyValue = function _convertPropertyValue(configValue, serviceName) {
	if (Array.isArray(configValue)) {
		for (var i = 0, j = configValue.length; i < j; i++) {
			configValue[i] = this._convertPropertyValue(configValue[i], serviceName + '.' + i);
		}
	} else if (typeof configValue === 'object') {
		var ref = this._config.getRef(serviceName);
		if (this._cache[ref]) {
			configValue = this._cache[ref];
		} else if (isService(configValue)) {
			configValue = this._getService(configValue, ref);
			this._cache[ref] = configValue;
		} else {
			for (var prop in configValue) {
				configValue[prop] = this._convertPropertyValue(configValue[prop], serviceName + '.' + prop);
			}
		}
	}

	return configValue;
};

proto.get = function get(serviceName) {
	var configValue = this._config.get(serviceName);
	if (configValue === undefined) {
		throw new ReferenceError('Config value not present in path ' + serviceName);
	}
	return this._convertPropertyValue(configValue, serviceName);
};

module.exports = MicroDiContainer;
