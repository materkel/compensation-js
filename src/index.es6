import redis from 'redis';

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
module.exports = function compensation({
  id = null,
  multiple = false,
  injectId = false,
  compensations = {},
  redisOptions = {}
}) {
  let client = redis.createClient(redisOptions);

  function add(key, action, ...parameters) {
    const data = { action, parameters };
    return new Promise((resolve, reject) => {
      client.set(key, JSON.stringify(data), (err, res) => {
        if (!err) {
          resolve(res);
        } else {
          reject(err);
        }
      });
    });
  }

  function addToId(key, action, ...parameters) {
    id = this.id ? this.id : id;
    const data = { action, parameters };
    return new Promise((resolve, reject) => {
      client.hset(key, id, JSON.stringify(data), (err, res) => {
        if (!err) {
          resolve(res);
        } else {
          reject(err);
        }
      });
    });
  }

  function appendToId(key, action, ...parameters) {
    id = this.id ? this.id : id;
    let data = { action, parameters };
    return new Promise((resolve, reject) => {
      client.watch(key);
      client.hget(key, id, (err, res) => {
        if (!err) {
          data = res ? [...JSON.parse(res), data] : [data];
          let multi = client.multi();
          multi.hset(key, id, JSON.stringify(data));
          multi.exec((err, res) => {
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

  function remove(key, id = null) {
    return new Promise((resolve, reject) => {
      if (id) {
        client.hdel(key, id, (err, res) => {
          if (!err) {
            resolve(res);
          } else {
            reject(err);
          }
        });
      } else {
        client.del(key, (err, res) => {
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
    return new Promise((resolve, reject) => {
      client.get(key, (err, data) => {
          if (!err) {
            const { action, parameters } = JSON.parse(data);
            const fn = compensations[action];
            // Call compensating action
            fn(...parameters)
              .then(res => {
                // Remove key on compensation success
                remove(key)
                  // Return result of compensation
                  .then(_res => {
                    resolve(res);
                  });
              })
              .catch(err => reject(err));
          } else {
            reject(err);
          }
        });
    });
  }

  function runId(key) {
    id = this.id ? this.id : id;
    return new Promise((resolve, reject) => {
      client.hget(key, id, (err, data) => {
        if (!err) {
          const { action, parameters } = JSON.parse(data);
          const fn = compensations[action];
          // Call compensating action
          fn(...parameters)
            .then(res => {
              // Remove id on compensation success
              remove(key, this.id)
                .then(_res => {
                  // Remove key when 0 ids are left
                  if (_res === 0) {
                    remove(key).then(__res => resolve(res));
                  } else {
                    resolve(res);
                  }
                });
            })
            .catch(err => reject(err));
        } else {
          reject(err);
        }
      });
    });
  }

  function runIdMultiple(key) {
    id = this.id ? this.id : id;
    return new Promise((resolve, reject) => {
      client.hget(key, id, (err, data) => {
        if (!err) {
          let promises = [];
          data = JSON.parse(data);
          // Call compensating actions
          data.forEach(compensationData => {
            const { action, parameters } = compensationData;
            const fn = compensations[action];
            promises.push(fn(...parameters));
          });
          Promise
            .all(promises)
            .then(res => {
              // Remove id on compensation success
              remove(key, id)
                .then(_res => {
                  // Remove key when 0 ids are left
                  if (_res === 0) {
                    remove(key).then(__res => resolve(res));
                  } else {
                    resolve(res);
                  }
                });
            })
            .catch(err => reject(err));
        } else {
          reject(err);
        }
      });
    });
  }

  function addToId_injectId(key, id, action, ...parameters) {
    this.id = id;
    return addToId.call(this, key, action, ...parameters);
  }

  function appendToId_injectId(key, id, action, ...parameters) {
    this.id = id;
    return appendToId.call(this, key, action, ...parameters);
  }

  function runIdMultiple_injectId(key, id) {
    this.id = id;
    return runIdMultiple.call(this, key);
  }

  function runId_injectId(key, id) {
    this.id = id;
    return runId.call(this, key);
  }

  const obj = { remove };
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
