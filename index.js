'use strict';

var _redis = require('redis');

var _redis2 = _interopRequireDefault(_redis);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var client = _redis2.default.createClient();

module.exports = function () {
  var config = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  return {
    config: config,
    add: function add(id, action) {
      for (var _len = arguments.length, parameters = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
        parameters[_key - 2] = arguments[_key];
      }

      var key = id.toString();
      var data = JSON.stringify({ action: action, parameters: parameters });
      return new Promise(function (resolve, reject) {
        client.set(key, data, function (err, res) {
          if (!err) {
            resolve();
          }
          reject(err);
        });
      });
    },
    run: function run(id) {
      var key = id.toString();
      return new Promise(function (resolve, reject) {
        client.get(key, function (err, data) {
          if (!err) {
            var _JSON$parse = JSON.parse(data);

            var action = _JSON$parse.action;
            var parameters = _JSON$parse.parameters;

            var fn = config[action];
            fn.apply(undefined, _toConsumableArray(parameters)).then(function (res) {
              resolve(res);
            }).catch(function (err) {
              return reject(err);
            });
          }
        });
      });
    }
  };
};