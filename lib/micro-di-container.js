var proto;

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
	this._config    = options.config.clone();
}
proto = MicroDiContainer.prototype;

proto._getService = function _getService(params) {
	var isFactory = !!params['@factory'];
	var isStatic  = !!params['@static'];
	var Service   = params['@proto'];
	if (!Service) {
		throw new Error('Service ' + path + ' not found');
	}
	var args = this._convertPropertyValue(params, true);

	return isFactory ? Service(args) : (isStatic ? Service : new Service(args));
};

proto._convertPropertyValue = function _convertPropertyValue(configValue, isServiceProcessing) {
	var result;

	if (Array.isArray(configValue)) {
		result = [];
		for (var i = 0, j = configValue.length; i < j; i++) {
			result.push(this._convertPropertyValue(configValue[i]));
		}
	} else if (typeof configValue === 'object') {
		if (configValue['@instance']) {
			result = configValue['@instance'];
		} else if (!isServiceProcessing && configValue['@proto']) {
			result = configValue['@instance'] = this._getService(configValue);
		} else {
			result = {};
			for (var prop in configValue) {
				if (prop.indexOf('@') === -1) {
					result[prop] = this._convertPropertyValue(configValue[prop]);
				}
			}
		}
	} else {
		result = configValue;
	}

	return result;
};

proto.get = function get(serviceName) {
	var configValue = this._config.get(serviceName);
	if (configValue === undefined) {
		throw new ReferenceError('Config value not present in path ' + serviceName);
	}
	return this._convertPropertyValue(configValue);
};

proto.getByTag = function getByTag(tag) {
	return this._config.getByTag(tag);
};

module.exports = MicroDiContainer;
