var proto,
	traverse = require('traverse');

function isService(params) {
	return params['@class'] || params['@factory'] || params['@static'];
}

function pathToArray(path) {
	return (path || '').split('.');
}

function escapeRegExp(string){
	return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

/**
 * Micro di
 *
 * @param {Object} options Options
 * @param {String} options.separator Variables separator
 * @param {Object} options.modules registered classes hash-map
 * @param {Object} options.config di config json
 */
function MicroDi(options) {
	this.name = 'MicroDi';
	if (!(this instanceof MicroDi)) {
		return new MicroDi(options);
	}
	options = options || {};
	this._cache = {};
	this._buildLocks = {};

	this._config    = traverse(options.config || {});
	this._refLabel  = options.refLabel || '@';
	this._refRegExp = RegExp(escapeRegExp(this._refLabel) + '(.*)' + escapeRegExp(this._refLabel) , 'g');
	this._modules   = traverse(options.modules || {});
}
proto = MicroDi.prototype;

proto._getService = function MicroDi__getService(params, paramsPath) {
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
	var args = this._convertPropertyValue(params, paramsPath, true);
	service = isFactory ? Service(args) : (isStatic ? Service : new Service(args));

	return service;
};

proto._convertPropertyValue = function MicroDi__convertPropertyValue(configValue, serviceName, noCheckLock) {
	var result;
	if (this._cache[serviceName]) {
		return this._cache[serviceName];
	}
	if (!noCheckLock && this._buildLocks[serviceName]) {
		throw new Error(serviceName);
	}
	this._buildLocks[serviceName] = true;

	if (typeof configValue === 'string') {
		var refPos = configValue.indexOf(this._refLabel);
		if (refPos === -1) {
			result = configValue;
		} else {
			var configValuePart = configValue.substring(refPos + 1);
			var lastRefPos = configValuePart.lastIndexOf(this._refLabel);
			if (lastRefPos === -1) {
				result = this.get(configValuePart);
			} else {
				result = configValue.replace(this._refRegExp, function replaceMacro(val, path) {
					return this.get(path);
				}.bind(this));
			}
		}
		
	} else if (Array.isArray(configValue)) {
		result = [];
		for (var i = 0, j = configValue.length; i < j; i++) {
			result.push(this._convertPropertyValue(configValue[i], serviceName + '.' + i));
		}
	} else if (typeof configValue === 'object') {
		if (isService(configValue)) {
			result = this._getService(configValue, serviceName);
		} else {
			result = {};
			for (var prop in configValue) {
				result[prop] = this._convertPropertyValue(configValue[prop], serviceName + '.' + prop);
			}
		}
	} else {
		result = configValue;
	}

	this._buildLocks[serviceName] = false;
	this._cache[serviceName] =  result;

	return result;
};

proto.get = function MicroDi_get(serviceName) {
	var configValue = this._config.get(pathToArray(serviceName));
	if (configValue === undefined) {
		throw new ReferenctError('Config value not present in path ' + serviceName);
	}
	return this._convertPropertyValue(configValue, serviceName);
};

module.exports = MicroDi;
