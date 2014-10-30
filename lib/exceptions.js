var de = require('define-exceptions');

var DiException = de.Exception(Error, 'DiException', 'Unknown MicroDi exception');

var Exceptions = de.Exceptions(DiException, {
	ProtoNotFound: 'Prototype not found in path %path%, params: %params%',
	ProtoNotAFunction: 'Prototype not a function in path %path%, params: %params%',
	UnknownInjectionType: 'Unknown injection type %type% not found in path %path%',
	CantResolveType: 'Can\'t resolve type %type%, not found in path %path%',
	CantFindService: 'Can\'t find service %path%'
});

Exceptions.DiException = DiException;

module.exports = Exceptions;
