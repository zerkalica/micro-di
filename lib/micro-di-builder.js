var proto;
var traverse = require('traverse');
var HyperConfig = require('hyper-config');
var MicroDiContainer = require('./micro-di-container');
var Exceptions = require('./exceptions');

var baseTypes = ['class', 'factory', 'static'];

function MicroDiBuilder(options) {
	this.name = 'MicroDiBuilder';
	if (!(this instanceof MicroDiBuilder)) {
		return new MicroDiBuilder(options);
	}
	options = options || {};
	this._config = HyperConfig(options);
	var keepScopes = this._keepScopes = options.keepScopes || ['persistent'];
	baseTypes.forEach(function (key) {
		this._config.addNormalizer(key, this._extractProto.bind(this, key));
	}.bind(this));
	this._buildedConfig = null;
	this._lastInstanceId = 1;
	var instances = this._instances = {};
	keepScopes.forEach(function (scope) {
		instances[scope] = {};
	});
}
MicroDiBuilder.Container = MicroDiContainer;
MicroDiBuilder.Exceptions = Exceptions;

proto = MicroDiBuilder.prototype;

proto._extractProto = function _prepareCommand(key, val, obj, acc) {
	var node = obj.parent.node;
	if (!node['@instanceId']) {
		node['@instanceId'] = this._lastInstanceId;
		node['@type'] = key;
		this._lastInstanceId++;
	}
};

proto.addConfig = function addConfig(config) {
	this._config.addConfig(config);

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
		this.addConfig({
			'MicroDi.getContainer': this.getContainer.bind(this)
		});
		this._buildedConfig = this._config.build();
	}
	var instances = {};
	this._keepScopes.forEach(function (scope) {
		instances[scope] = this._instances[scope];
	}.bind(this));
	return new MicroDiBuilder.Container({
		instances: instances,
		baseTypes: baseTypes,
		config: this._buildedConfig
	});
};

module.exports = MicroDiBuilder;
