# compensation-js

library for saving and running compensating actions. Compensating actions are persisted in [redis](http://redis.io/)

## Setup

```javascript
npm install mfressdorf/compensation-js
```

## Usage
...

## Example

Example in use with [transaction-utility-amqp](https://github.com/mfressdorf/transaction-utility-amqp)

```javascript
...
const compensationLib = require('compensation-js');

// Set up compensating action method mapping
const compensations = {
  'create': Job.create,
  'update': Job.update,
  'delete': Job.delete
}
const redisOptions = {
  host: process.env.NODE_ENV === 'production' ? 'redis' : 'localhost',
  port: 6379
}
const compensationConfig = { compensations, redisOptions, id: 'JobApi' };
const compensation = compensationLib(compensationConfig);

/**
 * Set up transaction listener for the job API
 */
transactionUtil.listener('job', msg => {
  // Receive 'end of transaction' message
  let { id, action } = JSON.parse(msg.content.toString());
  if (action === 'r') {
    // Run compensating action (rollback transaction)
    compensation.run(id);
  } else {
    // Remove compensating action (commit transaction)
    compensation.remove(id);
  }
  transactionUtil.unbind('job', transactionId);
});

/**
 * Transaction middleware
 */
function handleTransaction(req, res, next) {
  if (req.get('transaction_id')) {
    // Handle a Transaction
    const transactionId = req.get('transaction_id');
    req.transactionId = transactionId;
    // listen for commit/rollback
    transactionUtil.listen('job', transactionId);
  }
  next();
}

/**
 * REST Endpoint for creating a job
 */
app.post('/job', handleTransaction, (req, res) => {
  Job
    .create(req.body)
    .then(job => {
      if (req.transactionId) {
        // Add a compensation
        compensation.add(req.transactionId, 'delete', job.id);
      }
      res.json(job);
    })
    .catch(err => {
      log.debug(err);
      res.status(400).json(err);
    });
});
```
