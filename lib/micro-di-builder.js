var proto;
var traverse = require('traverse');
var HyperConfig = require('hyper-config');
var MicroDiContainer = require('./micro-di-container');

function MicroDiBuilder(options) {
	this.name = 'MicroDiBuilder';
	if (!(this instanceof MicroDiBuilder)) {
		return new MicroDiBuilder(options);
	}
	options = options || {};
	this._config = HyperConfig(options);
	['class', 'factory', 'static'].forEach(function (key) {
		this._config.addNormalizer(key, this._extractProto.bind(this));
	}.bind(this));
	this._modules = traverse({});
	this._buildedConfig = null;
	this._lastInstanceId = 1;
	this._prototypes = {};
}
MicroDiBuilder.Container = MicroDiContainer;

proto = MicroDiBuilder.prototype;

proto._extractProto = function _prepareCommand(val, obj, acc) {
	var node = obj.parent.node;
	if (!node['@instanceId']) {
		node['@instanceId'] = this._lastInstanceId;
		var proto = null;
		if (typeof val === 'function') {
			proto = val;
		} else if (typeof val === 'string') {
			proto = this._modules.get(val.split('.'));
		} else if (typeof val !== 'object') {
			throw new Error('value is not function or string in path: ' + obj.path.join('.'));
		}

		this._prototypes[node['@instanceId']] = proto;

		this._lastInstanceId++;
	}
};

proto.addConfig = function addConfig(config) {
	this._config.addConfig(config);

	return this;
};

proto.addModules = function addModules(modulesHash) {
	for(var name in modulesHash) {
		var path = [name];
		if (this._modules.has(path)) {
			throw new ReferenceError('Redefining module ' + name);
		}
		this._modules.set(path, modulesHash[name]);
	}

	return this;
};

/**
 * Build di container
 *
 * @return {Function} microdi.get
 * @return {Function} microdi.getByTag
 */
proto.getContainer = function getContainer() {
	if (!this._buildedConfig) {
		this.addModules({
			MicroDi: {
				getContainer: this.getContainer.bind(this)
			}
		});
		this._buildedConfig = this._config.build();
	}

	return new MicroDiBuilder.Container({
		config: this._buildedConfig,
		prototypes: this._prototypes
	});
};

module.exports = MicroDiBuilder;
