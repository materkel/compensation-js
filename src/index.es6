import redis from 'redis';

const client = redis.createClient();

module.exports = (config = {}) => {
  return {
    config,
    add: (id, action, ...parameters) => {
      const key = id.toString();
      const data = JSON.stringify({ action, parameters });
      return new Promise((resolve, reject) => {
        client.set(key, data, function(err, res) {
          if (!err) {
            resolve();
          }
          reject(err);
        });
      });
    },
    run: (id) => {
      const key = id.toString();
      return new Promise((resolve, reject) => {
        client.get(key, function(err, data) {
          if (!err) {
            const { action, parameters } = JSON.parse(data);
            const fn = config[action];
            // Call compensating action
            fn(...parameters)
              .then(res => {
                resolve(res);
              })
              .catch(err => reject(err));
          }
        });
      });
    }
  }
};
