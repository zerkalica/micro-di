var expect = require('./test-helpers').expect;
var Builder = require('../lib/micro-di-builder');

describe('micro-di-builder', function () {
  var testConfig = {
    'ul': {
      'transports': {
        't': {
          '@class': '~Transports.console',
          'par': 'p1'
        }
      },
      'logger': {
        '@class': '~Logger',
        'transports': '~ul.transports',
        '@tags': ['t1']
      },
      'some-2': {
        '@factory': '~Some',
        '@inject': 'arguments',
        'name': 'test',
        'email': 'test~~email',
        '@tags': ['t1', 't2']
      },
      'some': {
        '@factory': '~Some',
        '@inject': 'arguments',
        '@scope': 'req',
        'name': 'test',
        'email': 'test~~email'
      }
    }
  };

  var testServices = {
    Logger: function Logger(options) {
      this.options = options;
    },
    Transports: {
      console: function (options) {
        this.par = options.par;
      },
      file: function () {

      }
    },
    Some: function (email, name) {
        var o = {};
        o.name = name;
        o.email = email;

        return o;
    }
  };

  function Module(message) {
    return function MyFunc(par) {
      return message + '-' + par + '-par';
    };
  }

  Module['~definition'] = {
    'my.testNs.module': {
      '@factory': Module,
      '@inject': 'arguments',
      'message': 'test-module-message'
    }
  };

  describe('#getContainer.get', function () {
    var di, c;
    beforeEach(function () {
      di = Builder()
        .addConfig(testServices)
        .addConfig(Module['~definition'])
        .addConfig(testConfig);
      c = di.getContainer({process: {}, req: {}});
    });

    it('should return valid service', function () {
      expect(c.get('ul.logger'))
        .to.be.instanceOf(testServices.Logger)
        .and.to.have.property('options');
    });

    it('should return valid service injected thru definition', function () {
      expect(c.get('my.testNs.module')('vvv')).to.be.equal('test-module-message-vvv-par');
    });

    it('should return reference', function () {
      expect(c.get('ul.logger.transports.t'))
        .to.be.equal(c.get('ul.transports.t'));
    });

    it('should load by tag', function () {
      expect(c.getByTag('t2')[0])
        .to.be.equal(c.get('ul.some-2'));
    });

    it('should resolve refs and deps', function () {
      expect(c.get('ul.logger').options.transports.t)
        .to.be.instanceOf(testServices.Transports.console);
    });
    it('should inject deps as positional arguments', function () {
      expect(c.get('ul.some-2').name).to.be.equal(testConfig.ul.some.name);
      expect(c.get('ul.some-2').email).to.be.equal('test~email');
    });

    describe('scopes', function () {
      it('should throw CantAccessScope if injects from depend scope', function () {
        var di = Builder({
          scopeDefs: {
            'process': {deps: null, tags: []},
            'req': {deps: 'process', tags: ['req', 'res']}
          }
        })
          .addConfig(testServices)
          .addConfig({
            's1': {
              '@class': '~Logger',
              '@scope': 'process',
              'dep': '~s2'
            },
            's2': {
              '@class': '~Transports.file',
              '@scope': 'req'
            },
          });
        expect(di.getContainer.bind(di)).to.throw(Builder.Exceptions.CantAccessScope);
      });

      it('should resolve scope from tags', function () {
        var di = Builder({
          scopeDefs: {
            'process': {deps: null, tags: []},
            'req': {deps: 'process', tags: ['req', 'res']}
          }
        })
          .addConfig(testServices)
          .addConfig({
            's1': {
              '@class': '~Logger',
              '@scope': 'process',
              'dep': '~s2'
            },
            's2': {
              '@class': '~Transports.file',
              '@tags': ['res']
            },
          });
        expect(di.getContainer.bind(di)).to.throw(Builder.Exceptions.CantAccessScope);
      });

      it('should not throw CantAccessScope if injects to depend scope', function () {
        var di = Builder({
          scopeDefs: {
            'process': {deps: null, tags: []},
            'req': {deps: 'process', tags: ['req', 'res']}
          }
        })
          .addConfig(testServices)
          .addConfig({
            's1': {
              '@class': '~Logger',
              '@scope': 'req',
              'dep': '~s2'
            },
            's2': {
              '@class': '~Transports.file',
              '@scope': 'process'
            },
          });
        expect(di.getContainer.bind(di)).not.to.throw();
      });

      it('should throw ScopeNotRegistered if not registered scope', function () {
        var di = Builder({
          scopeDefs: {
            'process': {deps: null, tags: []},
            'req': {deps: 'process', tags: ['req', 'res']}
          }
        })
          .addConfig(testServices)
          .addConfig({
            's1': {
              '@class': '~Logger',
              '@scope': 'test',
              'dep': '~s2'
            },
            's2': {
              '@class': '~Transports.file',
              '@scope': 'process'
            },
          });
        expect(di.getContainer.bind(di)).to.throw(Builder.Exceptions.ScopeNotRegistered);
      });

      it('should inherit instances from parent container', function () {
        var di = Builder({
          scopeDefs: {
            'process': {deps: null, tags: []},
            'req': {deps: 'process', tags: ['req', 'res']}
          }
        })
          .addConfig(testServices)
          .addConfig({
            's1': {
              '@class': '~Logger',
              '@scope': 'req',
              'dep': '~s2'
            },
            's2': {
              '@class': '~Transports.file',
              '@scope': 'process'
            },
          });
        var c1 = di.getContainer();
        var c2s2 = c1.setContext('req', {req: {test: 1}}).get('s2');
        var c3 = di.getContainer();
        expect(c1.get('s2')).to.equal(c2s2);
        expect(c1.get('s2')).not.to.equal(c3.get('s2'));
      });
    });
  });
});
