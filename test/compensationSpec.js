import chai from 'chai';
import compensationLib from '../index';
import redis from 'redis';

const db = redis.createClient();
const expect = chai.expect;

function clearUpDatabase(done) {
  db.flushdb((err, res) => {
    if (!err) {
      done();
    }
  });
}

before('Clear up databases', (done) => clearUpDatabase(done));

describe('The compensation library', () => {
  /********* Start Preparation Code **********/
	function createListing(data) {
		return true;
	}
	const configA = { compensations: { create: createListing } };
  const configB = { injectId: true, compensations: { create: createListing } };
  const configC = { id: 'serviceA', compensations: { create: createListing } };
  const configD = { id: 'serviceA', multiple: true, compensations: { create: createListing } };
	const compensationA = compensationLib(configA);
  const compensationB = compensationLib(configB);
  const compensationC = compensationLib(configC);
  const compensationD = compensationLib(configD);
  /********* End Preparation Code **********/

	it('should be initialized for configuration A (basic)', () => {
		expect(compensationA).to.be.an('object');
  });
  it('should be initialized for configuration B (injectId: true)', () => {
    expect(compensationB).to.be.an('object');
  });
  it('should be initialized for configuration C (id: serviceA)', () => {
    expect(compensationC).to.be.an('object');
  });
  it('should be initialized for configuration D (id: serviceA, multiple: true)', () => {
    expect(compensationD).to.be.an('object');
	});

	it('should have the desired properties for configuration A', () => {
		expect(compensationA).to.have.property('add');
		expect(compensationA).to.have.property('run');
    expect(compensationA).to.have.property('remove');
  });
  it('should have the desired properties for configuration B', () => {
    expect(compensationB).to.have.property('add');
    expect(compensationB).to.have.property('run');
    expect(compensationB).to.have.property('remove');
  });
  it('should have the desired properties for configuration C', () => {
    expect(compensationC).to.have.property('add');
    expect(compensationC).to.have.property('run');
    expect(compensationC).to.have.property('remove');
  });
  it('should have the desired properties for configuration D', () => {
    expect(compensationD).to.have.property('add');
    expect(compensationD).to.have.property('run');
    expect(compensationD).to.have.property('remove');
	});
});

describe('A compensation', () => {
  /********* Start Preparation Code **********/
  function createListing(data) {
    expect(data).to.be.defined;
    expect(data).to.be.an('object');
    return Promise.resolve(true);
  }
  function updateListing(id, data) {
    expect(id).to.be.defined;
    expect(data).to.be.defined;
    expect(data).to.be.an('object');
    return Promise.resolve(true);
  }
  const config = {
    compensations: {
      create: createListing,
      update: updateListing
    }
  };
  const compensation = compensationLib(config);
  /********* End Preparation Code **********/

	it('should be added to the database', done => {
    compensation
      .add('compensation', 'create', { id: 1, name: 'yo' })
      .then(res => {
        db.get('compensation', (err, res) => {
          if (!err) {
            expect(res).to.be.defined;
            res = JSON.parse(res);
            expect(res).to.be.an('object');
            expect(res.action).to.be.defined;
            expect(res.parameters).to.be.defined;
            expect(res.parameters).to.be.an('array');
            expect(res.parameters[0].id).to.be.equal(1);
            expect(res.parameters[0].name).to.be.equal('yo');
            done();
          } else {
            done(err);
          }
        });
      });
	});

  it('should be removed from the database', done => {
    compensation
      .remove('compensation')
      .then(res => {
        db.get('compensation', (err, res) => {
          if (!err) {
            expect(res).to.be.defined;
            done();
          } else {
            done(err);
          }
        });
      });
  });

	it('should be added to the database with multiple parameters', done => {
    compensation
      .add('compensationId2', 'update', 2, { name: 'hi' })
      .then(res => {
        db.get('compensationId2', (err, res) => {
          if (!err) {
            expect(res).to.be.defined;
            res = JSON.parse(res);
            expect(res).to.be.an('object');
            let { action, parameters } = res;
            expect(action).to.be.defined;
            expect(parameters).to.be.defined;
            expect(parameters).to.be.an('array');
            expect(parameters[0]).to.be.defined;
            expect(parameters[0]).to.be.equal(2);
            expect(parameters[1]).to.be.defined;
            expect(parameters[1]).to.be.an('object');
            expect(parameters[1].name).to.be.equal('hi');
            done();
          } else {
            done(err);
          }
        })
      });
	});

  it('should return a promise when added', done => {
    compensation
      .add('compensationIdxyz', 'create', { id: 1, name: 'yo' })
      .then(() => done())
      .catch(err => done());
  });

  it('should return a promise when removed', done => {
    compensation
      .add('compensationIdzy', 'create', { id: 1, name: 'yo' })
      .then(res => compensation.remove('compensationIdzy'))
      .then(() => done())
      .catch(err => done());
  });

  it('should return a promise when called', done => {
    compensation
      .run('compensationIdxyz')
      .then(res => done())
      .catch(err => done(err));
  });

	it('should be called', done => {
    compensation
      .add('compensationId3', 'create', { id: 2, name: 'yo' })
      .then(res => compensation.run('compensationId3'))
      .then(res => done())
      .catch(err => done(err));
	 });

	it('should be called with multiple parameters', done => {
    compensation
      .add('compensationId4', 'update', 1, { name: 'yes' })
      .then(res => compensation.run('compensationId4'))
      .then(res => done())
      .catch(err => done(err));
	});
});

describe('A compensation with service key', () => {
  /********* Start Preparation Code **********/
  function createListing(data) {
    expect(data).to.be.defined;
    expect(data).to.be.an('object');
    return Promise.resolve(true);
  }
  function updateListing(id, data) {
    expect(id).to.be.defined;
    expect(data).to.be.defined;
    expect(data).to.be.an('object');
    return Promise.resolve(true);
  }
  const config = {
    injectId: true,
    compensations: {
      create: createListing,
      update: updateListing
    }
  };
  const compensation = compensationLib(config);
  /********* End Preparation Code **********/

  it('should be added to the database', done => {
    compensation
      .add('compensation', 'serviceKey', 'create', { id: 1, name: 'yo' })
      .then(res => {
        db.hget('compensation', 'serviceKey', (err, res) => {
          if (!err) {
            expect(res).to.be.defined;
            res = JSON.parse(res);
            expect(res).to.be.an('object');
            expect(res.action).to.be.defined;
            expect(res.parameters).to.be.defined;
            expect(res.parameters).to.be.an('array');
            expect(res.parameters[0].id).to.be.equal(1);
            expect(res.parameters[0].name).to.be.equal('yo');
            done();
          } else {
            done(err);
          }
        });
      });
  });

  it('should be removed from the database', done => {
    compensation
      .remove('compensation', 'serviceKey')
      .then(res => {
        db.get('compensation', (err, res) => {
          if (!err) {
            expect(res).to.be.defined;
            done();
          } else {
            done(err);
          }
        });
      });
  });

  it('should be added to the database with multiple parameters', done => {
    compensation
      .add('compensationIdasdf', 'serviceKey', 'update', 2, { name: 'hi' })
      .then(res => {
        db.hget('compensationIdasdf', 'serviceKey', (err, res) => {
          if (!err) {
            expect(res).to.be.defined;
            res = JSON.parse(res);
            expect(res).to.be.an('object');
            let { action, parameters } = res;
            expect(action).to.be.defined;
            expect(parameters).to.be.defined;
            expect(parameters).to.be.an('array');
            expect(parameters[0]).to.be.defined;
            expect(parameters[0]).to.be.equal(2);
            expect(parameters[1]).to.be.defined;
            expect(parameters[1]).to.be.an('object');
            expect(parameters[1].name).to.be.equal('hi');
            done();
          } else {
            done(err);
          }
        })
      })
      .catch(err => done(err));
  });

  it('should return a promise when added', done => {
    compensation
      .add('compensationIdxyz', 'serviceKey', 'create', { id: 1, name: 'yo' })
      .then(() => done())
      .catch(err => done());
  });

  it('should return a promise when removed', done => {
    compensation
      .add('compensationIdzy', 'serviceKey', 'create', { id: 1, name: 'yo' })
      .then(res => compensation.remove('compensationIdzy'))
      .then(() => done())
      .catch(err => done());
  });

  it('should return a promise when called', done => {
    compensation
      .run('compensationIdxyz', 'serviceKey')
      .then(res => done())
      .catch(err => done(err));
  });

  it('should be called', done => {
    compensation
      .add('compensationId3', 'serviceKey', 'create', { id: 2, name: 'yo' })
      .then(res => compensation.run('compensationId3', 'serviceKey'))
      .then(res => done())
      .catch(err => done(err));
   });

  it('should be called with multiple parameters', done => {
    compensation
      .add('compensationId4', 'serviceKey', 'update', 1, { name: 'yes' })
      .then(res => compensation.run('compensationId4', 'serviceKey'))
      .then(res => done())
      .catch(err => done(err));
  });
});

describe('Multiple compensations with different serviceKeys', () => {
  /********* Start Preparation Code **********/
  function createListing(data) {
    expect(data).to.be.defined;
    expect(data).to.be.an('object');
    return Promise.resolve(true);
  }
  function updateListing(id, data) {
    expect(id).to.be.defined;
    expect(data).to.be.defined;
    expect(data).to.be.an('object');
    return Promise.resolve(true);
  }
  const config = {
    injectId: true,
    compensations: {
      create: createListing,
      update: updateListing
    }
  };
  const compensation = compensationLib(config);
  /********* End Preparation Code **********/

  it('should be added with the same compensation id and different service keys', done => {
    let promises = [];
    promises.push(compensation.add('compensationidd', 'service1', 'update', 2, { name: 'hi' }));
    promises.push(compensation.add('compensationidd', 'service2', 'create', { id: 2, name: 'yo' }));
    Promise
      .all(promises)
      .then(res => {
        db.hgetall('compensationidd', (err, res) => {
          if (!err) {
            expect(res).to.be.an('object');
            for (let serviceKey in res) {
              let compensation = res[serviceKey];
              expect(compensation).to.be.defined;
              compensation = JSON.parse(compensation);
              expect(compensation).to.be.an('object');
              let { action, parameters } = compensation;
              expect(action).to.be.defined;
              expect(parameters).to.be.defined;
              expect(parameters).to.be.an('array');
            }
            done();
          } else {
            done(err);
          }
        });
      });
  });

  it('should be removed from the database', done => {
    compensation
      .remove('compensationidd')
      .then(res => {
        db.get('compensationidd', (err, res) => {
          if (!err) {
            expect(res).to.be.defined;
            done();
          } else {
            done(err);
          }
        });
      });
  });
});

describe('Multiple compensations for the same serviceKey', () => {
  /********* Start Preparation Code **********/
  function createListing(data) {
    expect(data).to.be.defined;
    expect(data).to.be.an('object');
    return Promise.resolve(true);
  }
  function updateListing(id, data) {
    expect(id).to.be.defined;
    expect(data).to.be.defined;
    expect(data).to.be.an('object');
    return Promise.resolve(true);
  }
  const config = {
    id: 'serviceA',
    multiple: true,
    compensations: {
      create: createListing,
      update: updateListing
    }
  };
  const compensation = compensationLib(config);
  /********* End Preparation Code **********/

  it('should be added with the same compensation id and same service keys', done => {
    compensation
      .add('compensationidd', 'update', 2, { name: 'hi' })
      .then(() => compensation.add('compensationidd', 'create', { id: 2, name: 'yo' }))
      .then(() => {
        db.hget('compensationidd', 'serviceA', (err, compensations) => {
          if (!err) {
            expect(compensations).to.be.defined;
            compensations = JSON.parse(compensations);
            expect(compensations).to.be.an('array');
            compensations.forEach(compensation => {
              let { action, parameters } = compensation;
              expect(action).to.be.defined;
              expect(parameters).to.be.defined;
              expect(parameters).to.be.an('array');
            });
            done();
          } else {
            done(err);
          }
        });
      });
  });

  it('should be removed from the database', done => {
    compensation
      .remove('compensationidd')
      .then(res => {
        db.get('compensationidd', (err, res) => {
          if (!err) {
            expect(res).to.be.defined;
            done();
          } else {
            done(err);
          }
        });
      });
  });
});

after('Clear up databases', (done) => clearUpDatabase(done));
