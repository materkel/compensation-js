import redis from 'redis';

module.exports = (config = {}, redisOptions = {}) => {
  let client = redis.createClient(redisOptions);
  function add(key, serviceKey = null, action, ...parameters) {
    const data = { action, parameters };
    return new Promise((resolve, reject) => {
      if (serviceKey) {
        client.hset(key, serviceKey, JSON.stringify(data), (err, res) => {
          if (!err) {
            resolve(res);
          } else {
            reject(err);
          }
        });
      } else {
        client.set(key, JSON.stringify(data), (err, res) => {
          if (!err) {
            resolve(res);
          } else {
            reject(err);
          }
        });
      }
    });
  }

  function remove(key, serviceKey = null) {
    return new Promise((resolve, reject) => {
      if (serviceKey) {
        client.hdel(key, serviceKey, (err, res) => {
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

  function run(key, serviceKey = null) {
    return new Promise((resolve, reject) => {
      if (serviceKey) {
        client.hget(key, serviceKey, (err, data) => {
          if (!err) {
            const { action, parameters } = JSON.parse(data);
            const fn = config[action];
            // Call compensating action
            fn(...parameters)
              .then(res => {
                // Remove serviceKey on compensation success
                remove(key, serviceKey)
                  .then(_res => {
                    // Remove key when 0 servicekeys are left
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
      } else {
        client.get(key, (err, data) => {
          if (!err) {
            const { action, parameters } = JSON.parse(data);
            const fn = config[action];
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
      }
    });
  }

  return {
    client,
    config,
    add,
    remove,
    run
  }
};
