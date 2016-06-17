'use strict';

var _redis = require('redis');

var _redis2 = _interopRequireDefault(_redis);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/**
 * Compensation Factory
 * @param  {Object} config
 * @param  {string} config.id - set a static id, used for all further compensations
 * @param  {boolean} config.multiple - if set to true, multiple values can be saved for the same id
 * @param  {boolean} config.injectId - if set to true, the id must be injected with compensations
 * @param  {Object} config.compensations - add the compensation functions
 * @param  {Object} config.redisOptions - add special redis connection settings
 * @return {Object}
 */
module.exports = function compensation(_ref) {
  var _ref$id = _ref.id;
  var id = _ref$id === undefined ? null : _ref$id;
  var _ref$multiple = _ref.multiple;
  var multiple = _ref$multiple === undefined ? false : _ref$multiple;
  var _ref$injectId = _ref.injectId;
  var injectId = _ref$injectId === undefined ? false : _ref$injectId;
  var _ref$compensations = _ref.compensations;
  var compensations = _ref$compensations === undefined ? {} : _ref$compensations;
  var _ref$redisOptions = _ref.redisOptions;
  var redisOptions = _ref$redisOptions === undefined ? {} : _ref$redisOptions;

  var client = _redis2.default.createClient(redisOptions);

  function add(key, action) {
    for (var _len = arguments.length, parameters = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
      parameters[_key - 2] = arguments[_key];
    }

    var data = { action: action, parameters: parameters };
    return new Promise(function (resolve, reject) {
      client.set(key, JSON.stringify(data), function (err, res) {
        if (!err) {
          resolve(res);
        } else {
          reject(err);
        }
      });
    });
  }

  function addToId(key, action) {
    for (var _len2 = arguments.length, parameters = Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
      parameters[_key2 - 2] = arguments[_key2];
    }

    id = this.id ? this.id : id;
    var data = { action: action, parameters: parameters };
    return new Promise(function (resolve, reject) {
      client.hset(key, id, JSON.stringify(data), function (err, res) {
        if (!err) {
          resolve(res);
        } else {
          reject(err);
        }
      });
    });
  }

  function appendToId(key, action) {
    for (var _len3 = arguments.length, parameters = Array(_len3 > 2 ? _len3 - 2 : 0), _key3 = 2; _key3 < _len3; _key3++) {
      parameters[_key3 - 2] = arguments[_key3];
    }

    id = this.id ? this.id : id;
    var data = { action: action, parameters: parameters };
    return new Promise(function (resolve, reject) {
      client.watch(key);
      client.hget(key, id, function (err, res) {
        if (!err) {
          data = res ? [].concat(_toConsumableArray(JSON.parse(res)), [data]) : [data];
          var multi = client.multi();
          multi.hset(key, id, JSON.stringify(data));
          multi.exec(function (err, res) {
            if (!err) {
              resolve(res);
            } else {
              reject(err);
            }
          });
        } else {
          reject(err);
        }
      });
    });
  }

  function remove(key) {
    var id = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];

    return new Promise(function (resolve, reject) {
      if (id) {
        client.hdel(key, id, function (err, res) {
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
    return new Promise(function (resolve, reject) {
      client.get(key, function (err, data) {
        if (!err) {
          var _JSON$parse = JSON.parse(data);

          var action = _JSON$parse.action;
          var parameters = _JSON$parse.parameters;

          var fn = compensations[action];
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
    });
  }

  function runId(key) {
    var _this = this;

    id = this.id ? this.id : id;
    return new Promise(function (resolve, reject) {
      client.hget(key, id, function (err, data) {
        if (!err) {
          var _JSON$parse2 = JSON.parse(data);

          var action = _JSON$parse2.action;
          var parameters = _JSON$parse2.parameters;

          var fn = compensations[action];
          // Call compensating action
          fn.apply(undefined, _toConsumableArray(parameters)).then(function (res) {
            // Remove id on compensation success
            remove(key, _this.id).then(function (_res) {
              // Remove key when 0 ids are left
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
    });
  }

  function runIdMultiple(key) {
    id = this.id ? this.id : id;
    return new Promise(function (resolve, reject) {
      client.hget(key, id, function (err, data) {
        if (!err) {
          (function () {
            var promises = [];
            data = JSON.parse(data);
            // Call compensating actions
            data.forEach(function (compensationData) {
              var action = compensationData.action;
              var parameters = compensationData.parameters;

              var fn = compensations[action];
              promises.push(fn.apply(undefined, _toConsumableArray(parameters)));
            });
            Promise.all(promises).then(function (res) {
              // Remove id on compensation success
              remove(key, id).then(function (_res) {
                // Remove key when 0 ids are left
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
          })();
        } else {
          reject(err);
        }
      });
    });
  }

  function addToId_injectId(key, id, action) {
    this.id = id;

    for (var _len4 = arguments.length, parameters = Array(_len4 > 3 ? _len4 - 3 : 0), _key4 = 3; _key4 < _len4; _key4++) {
      parameters[_key4 - 3] = arguments[_key4];
    }

    return addToId.call.apply(addToId, [this, key, action].concat(parameters));
  }

  function appendToId_injectId(key, id, action) {
    this.id = id;

    for (var _len5 = arguments.length, parameters = Array(_len5 > 3 ? _len5 - 3 : 0), _key5 = 3; _key5 < _len5; _key5++) {
      parameters[_key5 - 3] = arguments[_key5];
    }

    return appendToId.call.apply(appendToId, [this, key, action].concat(parameters));
  }

  function runIdMultiple_injectId(key, id) {
    this.id = id;
    return runIdMultiple.call(this, key);
  }

  function runId_injectId(key, id) {
    this.id = id;
    return runId.call(this, key);
  }

  var obj = { remove: remove };
  if (injectId) {
    obj.add = multiple ? appendToId_injectId : addToId_injectId;
    obj.run = multiple ? runIdMultiple_injectId : runId_injectId;
  } else if (id) {
    obj.add = multiple ? appendToId : addToId;
    obj.run = multiple ? runIdMultiple : runId;
  } else {
    obj.add = add;
    obj.run = run;
  }

  return obj;
};