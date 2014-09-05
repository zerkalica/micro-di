var e = {};

function inherit (e) {
	var proto;

	proto = e.prototype;
	proto = new Error();
	proto.constructor = e;

	return e;
}

e.ServiceRecursiveCallException = inherit(function (serviceName) {
	this.name = 'ServiceRecursiveCallException';
	this.message = 'Recursive dependencies with ' + serviceName + ' service';
});

e.ServiceNotConfiguredException = inherit(function (serviceName) {
	this.name = 'ServiceNotConfiguredException';
	this.message = 'Service ' + serviceName + ' is not cofigured';
});

e.VariableDefinedException = inherit(function (key) {
	this.name = 'VariableDefinedException';
	this.message = 'Variable ' + key + ' already defined in scope';
});

e.MicroDiAlreadyInitializedException = inherit(function (key) {
	this.name = 'MicroDiAlreadyInitializedException';
	this.message = 'Container already initialized,  addConfig or addVariables before fist get';
});

module.exports = e;
