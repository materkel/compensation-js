import redis from 'redis';

const client = redis.createClient();

module.exports = (config = {}) => {
  return {
    config,
    add: (id, action, ...parameters) => {
      const key = id.toString();
      const data = { action, parameters };
      return new Promise((resolve, reject) => {
        client.set(key, JSON.stringify(data), (err, res) => {
          if (!err) {
            resolve(data);
          } else {
            reject(err);
          }
        });
      });
    },
    remove: id => {
      const key = id.toString();
      return new Promise((resolve, reject) => {
        client.del(key, (err, res) => {
          if (!err) {
            resolve(res);
          } else {
            reject(err);
          }
        });
      });
    },
    run: id => {
      const key = id.toString();
      return new Promise((resolve, reject) => {
        client.get(key, (err, data) => {
          if (!err) {
            const { action, parameters } = JSON.parse(data);
            const fn = config[action];
            // Call compensating action
            fn(...parameters)
              .then(res => resolve(res))
              .catch(err => reject(err));
          } else {
            reject(err);
          }
        });
      });
    }
  }
};
