var expect = require('./test-helpers').expect;
var Builder = require('../lib/micro-di-builder');

describe('micro-di-builder', function () {
  var di, c;
  var testConfig = {
    'ul': {
      'transports': [
        {
          '@class': 'Transports.console',
          'par': 'p1'
        }
      ],
      'logger': {
        '@class': 'Logger',
        'transports': '@ul.transports'
      },
      'some': {
        '@factory': 'Some',
        '@inject': 'arguments',
        'name': 'test',
        'email': 'test@@email'
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

  before(function () {
    di = Builder()
      .addConfig(testConfig)
      .addModules(testServices);
    c = di.getContainer();
  });

  describe('#getContainer.get', function () {
    it('should return valid service', function () {
      expect(c.get('ul.logger'))
        .to.be.instanceOf(testServices.Logger)
        .and.to.have.property('options');
    });

    it('should resolve refs and deps', function () {
      expect(c.get('ul.logger').options.transports[0])
        .to.be.instanceOf(testServices.Transports.console);
    });
    it('should inject deps as positional arguments', function () {
      expect(c.get('ul.some').name).to.be.equal(testConfig.ul.some.name);
      expect(c.get('ul.some').email).to.be.equal('test@email');
    });
  });
});
