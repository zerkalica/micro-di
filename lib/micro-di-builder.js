var proto;
var traverse = require('traverse');
var HyperConfig = require('hyper-config');
var MicroDiContainer = require('./micro-di-container');
var Exceptions = require('./exceptions');
var assertThrow = require('define-exceptions').assertThrow;
var baseTypes = ['class', 'factory', 'static'];

var defaultScopeDefs = {
	'default': {deps: null, tags: []},
	'req': {deps: 'default', tags: ['req', 'res']}
};

function MicroDiBuilder(options) {
	this.name = 'MicroDiBuilder';
	if (!(this instanceof MicroDiBuilder)) {
		return new MicroDiBuilder(options);
	}
	options = options || {};
	this._config = HyperConfig(options);
	
	baseTypes.forEach(function (key) {
		this._config.addNormalizer(key, this._extractProto.bind(this, key));
	}.bind(this));
	this._buildedConfig = null;
	this._lastInstanceId = 1;
	this._scopeDeps = {};
	this._tagToScopeMap = {};
	var defs = options.scopeDefs || defaultScopeDefs;
	for (var scope in defs) {
		var def = defs[scope];
		this._scopeDeps[scope] = def.deps;
		def.tags.forEach(function addTagToObject(tag) {
			this._tagToScopeMap[tag] = scope;
		}.bind(this));
	}
}
MicroDiBuilder.Exceptions = Exceptions;

proto = MicroDiBuilder.prototype;

proto._extractProto = function _prepareCommand(key, val, obj, acc) {
	var prevScope, prevPath, currentScope, currentPath, i, j;
	var node = obj.parent.node;
	var path = obj.path.slice(0, obj.path.length - 1);
	if (!node['@instanceId']) {
		node['@instanceId'] = this._lastInstanceId;
		node['@type'] = key;
		if (!acc.scopes) {
			acc.scopes = {};
		}

		currentScope = node['@scope'] || this._getScopeFromTags(node['@tags'] || []);
		node['@scope'] = acc.scopes[path.join('.')] = currentScope;
		for(i = 0, j = path.length; i < j; i++) {
			currentPath = path.slice(0, i + 1).join('.');

			currentScope = acc.scopes[currentPath];
			if (currentScope) {
				assertThrow(this._scopeDeps[currentScope] !== undefined, Exceptions.ScopeNotRegistered, {scope: currentScope});
				assertThrow(
					!prevScope ||
					prevScope === currentScope || // если scope не изменился - все ок
					currentScope === this._scopeDeps[prevScope], // если текущий scope не числится в зависимостях prevScope - все ок
					// переход req->default допустим, default->req - нет
					// this._scopeDeps['req']: 'default', currentScope: 'default'
					// this._scopeDeps['default']: null, currentScope: 'req'
					Exceptions.CantAccessScope,
					{
						currentScope: currentScope,
						currentPath: currentPath,
						prevScope: prevScope,
						prevPath: prevPath
					}
				);
				prevScope = currentScope;
				prevPath = currentPath;
			}
		}

		this._lastInstanceId++;
	}
};

proto._getScopeFromTags = function (tags) {
	for (var i = 0, j = tags.length; i < j; i++) {
		var scope = this._tagToScopeMap[tags[i]];
		if (scope) {
			return scope;
		}
	}

	return 'default';
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
			microdi: {
				clone: {
					'@class': MicroDiContainer
				}
			}
		});
		this._buildedConfig = this._config.build();
	}

	return new MicroDiContainer({baseTypes: baseTypes, config: this._buildedConfig});
};

module.exports = MicroDiBuilder;
