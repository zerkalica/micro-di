var proto;
var Exceptions = require('./exceptions');
var assertOk = require('define-exceptions').assertOk;

function getArgNames(Proto) {
	return Proto.toString()
		.replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s))/mg,'')
		.match(/^function\s*[^\(]*\(\s*([^\)]*)\)/m)[1]
		.split(/,/);
}

function objectToArguments(Proto, argsObject) {
	var argNames = getArgNames(Proto);
	var args = [];
	for (var i = 0, j = argNames.length; i < j; i++) {
		args.push(argsObject[argNames[i]]);
	}
	return args;
}

function construct(constructor, args) {
	function F() {
		return constructor.apply(this, args);
	}
	F.prototype = constructor.prototype;

	return new F();
}

function ucFirst(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

function setContextDefaultCb(context, container) {
	for (var name in context) {
		var method = 'set' + ucFirst(name);
		var val = context[name];
		var services = container.getByTag(name);
		for (var i = 0, j = services.length; i < j; i++) {
			services[i][method](val);
		}
	}
}

/**
 * Micro di
 *
 * @param {Object} options.prototypes Prototypes map
 * @param {Object} options.config di config json
 */
function MicroDiContainer(options) {
	this.name = 'MicroDiContainer';
	if (!(this instanceof MicroDiContainer)) {
		return new MicroDiContainer(options);
	}
	options = options || {};
	this._config    = options.config;
	this._contexts = options._contexts || {process: {}};
	var selfInstanceId = options.selfInstanceId;
	if(!this._contexts) {
		throw new Exceptions.ScopeNotRegistered({scope: 'unknown'});
	}
	this._types = options.baseTypes;
	for (var contextName in this._contexts) {
		this._contexts[contextName][selfInstanceId] = this.setContext.bind(this);
	}
}
proto = MicroDiContainer.prototype;

proto.setContext = function setContext(contextName, cb) {
	cb = typeof cb === 'function' ? cb : setContextDefaultCb.bind(null, cb);
	var contexts = {};
	contexts[contextName] = {};

	for(var name in this._contexts) {
		contexts[name] = this._contexts[name];
	}

	var container = new MicroDiContainer({
		_contexts: contexts,
		baseTypes: this._types,
		config: this._config
	});

	cb(container);

	return container;
};

proto._getService = function _getService(params, context) {
	var service;
	var argsInjectionType = params['@inject'] || 'object';
	var key               = params['@type'];
	var Proto             = params['@' + key];

	if (typeof Proto === 'object') {
		Proto = this._convertPropertyValue(Proto, {path: context.path});
	}

	assertOk(Proto, Exceptions.ProtoNotFound, {path: context.path, params: params});
	assertOk(typeof Proto === 'function', Exceptions.ProtoNotAFunction, {path: context.path, params: params});

	if (key === 'static') {
		service = Proto;
	} else {
		var argsObject = this._convertPropertyValue(params, {isServiceProcessing: true, path: context.path});
		var isFactory = key === 'factory';
		switch(argsInjectionType) {
			case 'object':
				service = isFactory ? Proto(argsObject) : new Proto(argsObject);
				break;
			case 'arguments':
				var args = objectToArguments(Proto, argsObject);
				service = isFactory ? Proto.apply(null, args) : construct(Proto, args);
				break;
			case 'props':
				service = isFactory ? Proto(argsObject) : new Proto(argsObject);
				for(var prop in argsObject) {
					service[prop] = argsObject[prop];
				}
				break;
			default:
				throw new Exceptions.UnknownInjectionType({type: argsInjectionType, path: context.path});
		}
	}

	return service;
};

proto._convertPropertyValue = function _convertPropertyValue(configValue, context) {
	var result;
	if (Array.isArray(configValue)) {
		result = [];
		for (var i = 0, j = configValue.length; i < j; i++) {
			result.push(this._convertPropertyValue(configValue[i], {path: context.path + '.' + i}));
		}
	} else if (typeof configValue === 'object') {
		var instanceId = configValue['@instanceId'];

		if (context.isServiceProcessing || !instanceId) {
			result = {};
			for (var prop in configValue) {
				if (prop.indexOf('@') === -1) {
					assertOk(configValue[prop] !== undefined, Exceptions.CantResolveType, {type: prop, path: context.path});
					result[prop] = this._convertPropertyValue(configValue[prop], {path: context.path + '.' + prop});
				}
			}
		} else {
			var scope = configValue['@scope'];
			var instances = this._contexts[scope];
			assertOk(!!instances, Exceptions.ScopeNotDefinedInContext, {scope: scope, path: context.path});
			if (!instances[instanceId]) {
				instances[instanceId] = this._getService(configValue, {path: context.path});
			}
			result = instances[instanceId];
		}
	} else {
		result = configValue;
	}

	return result;
};

proto.get = function get(serviceName) {
	var configValue = this._config.get(serviceName);
	assertOk(configValue !== undefined, Exceptions.CantFindService, {path: serviceName});
	return this._convertPropertyValue(configValue, {path: serviceName});
};

proto.getByTag = function getByTag(tag) {
	return this._config.getByTag(tag).map(function (configValue) {
		return this._convertPropertyValue(configValue, {path: tag});
	}.bind(this));
};

module.exports = MicroDiContainer;
