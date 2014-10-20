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
  });
});
