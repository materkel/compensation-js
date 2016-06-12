'use strict';

var _redis = require('redis');

var _redis2 = _interopRequireDefault(_redis);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

module.exports = function () {
  var config = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
  var redisOptions = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  var client = _redis2.default.createClient(redisOptions);
  function add(key) {
    for (var _len = arguments.length, parameters = Array(_len > 3 ? _len - 3 : 0), _key = 3; _key < _len; _key++) {
      parameters[_key - 3] = arguments[_key];
    }

    var serviceKey = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
    var action = arguments[2];

    var data = { action: action, parameters: parameters };
    return new Promise(function (resolve, reject) {
      if (serviceKey) {
        client.hset(key, serviceKey, JSON.stringify(data), function (err, res) {
          if (!err) {
            resolve(res);
          } else {
            reject(err);
          }
        });
      } else {
        client.set(key, JSON.stringify(data), function (err, res) {
          if (!err) {
            resolve(res);
          } else {
            reject(err);
          }
        });
      }
    });
  }

  function remove(key) {
    var serviceKey = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];

    return new Promise(function (resolve, reject) {
      if (serviceKey) {
        client.hdel(key, serviceKey, function (err, res) {
          if (!err) {
            resolve(res);
          } else {
            reject(err);
          }
        });
      } else {
        client.del(key, function (err, res) {
          if (!err) {
            resolve(res);
          } else {
            reject(err);
          }
        });
      }
    });
  }

  function run(key) {
    var serviceKey = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];

    return new Promise(function (resolve, reject) {
      if (serviceKey) {
        client.hget(key, serviceKey, function (err, data) {
          if (!err) {
            var _JSON$parse = JSON.parse(data);

            var action = _JSON$parse.action;
            var parameters = _JSON$parse.parameters;

            var fn = config[action];
            // Call compensating action
            fn.apply(undefined, _toConsumableArray(parameters)).then(function (res) {
              // Remove serviceKey on compensation success
              remove(key, serviceKey).then(function (_res) {
                // Remove key when 0 servicekeys are left
                if (_res === 0) {
                  remove(key).then(function (__res) {
                    return resolve(res);
                  });
                } else {
                  resolve(res);
                }
              });
            }).catch(function (err) {
              return reject(err);
            });
          } else {
            reject(err);
          }
        });
      } else {
        client.get(key, function (err, data) {
          if (!err) {
            var _JSON$parse2 = JSON.parse(data);

            var action = _JSON$parse2.action;
            var parameters = _JSON$parse2.parameters;

            var fn = config[action];
            // Call compensating action
            fn.apply(undefined, _toConsumableArray(parameters)).then(function (res) {
              // Remove key on compensation success
              remove(key)
              // Return result of compensation
              .then(function (_res) {
                resolve(res);
              });
            }).catch(function (err) {
              return reject(err);
            });
          } else {
            reject(err);
          }
        });
      }
    });
  }

  return {
    client: client,
    config: config,
    add: add,
    remove: remove,
    run: run
  };
};