var proto;
var traverse = require('traverse');
var HyperConfig = require('hyper-config');
var MicroDiContainer = require('./micro-di-container');
var Exceptions = require('./exceptions');

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
	this._buildedConfig = null;
	this._lastInstanceId = 1;
}
MicroDiBuilder.Container = MicroDiContainer;
MicroDiBuilder.Exceptions = Exceptions;

proto = MicroDiBuilder.prototype;

proto._extractProto = function _prepareCommand(val, obj, acc) {
	var node = obj.parent.node;
	if (!node['@instanceId']) {
		node['@instanceId'] = this._lastInstanceId;
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

	return new MicroDiBuilder.Container({
		config: this._buildedConfig
	});
};

module.exports = MicroDiBuilder;
