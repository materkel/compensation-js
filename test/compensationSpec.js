import chai from 'chai';
import compensationLib from '../index';
import redis from 'redis';

const db = redis.createClient();
const expect = chai.expect;

describe('The compensation library', () => {
  /********* Start Preparation Code **********/
	function createListing(data) {
		return true;
	}
	const config = { create: createListing }
	const compensation = compensationLib(config);
  /********* End Preparation Code **********/

	it('should be initialized', () => {
		expect(compensation).to.be.an('object');
	});

	it('should have the desired properties', () => {
    expect(compensation).to.have.property('config');
		expect(compensation).to.have.property('add');
		expect(compensation).to.have.property('run');
	});

  it('should contain the desired configuration', () => {
    expect(compensation.config).to.be.an('object');
    expect(compensation.config.create).to.be.a('function');
  });

  it('should be able to take new configuration data', () => {
    compensation.config = { 'update': createListing };
    expect(compensation.config.create).to.be.undefined;
    expect(compensation.config.update).to.be.a('function');
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
  let config = {
    create: createListing,
    update: updateListing
  };
  let compensation = compensationLib(config);
  /********* End Preparation Code **********/

	it('should be added to the database', done => {
    compensation.add('compensationId', 'create', { id: 1, name: 'yo' });
    db.get('compensationId', (err, res) => {
      if (!err) {
        expect(res).to.be.defined;
        res = JSON.parse(res);
        expect(res).to.be.an('object');
        expect(res.action).to.be.defined;
        expect(res.parameters).to.be.defined;
        expect(res.parameters).to.be.an('array');
        expect(res.parameters[0].id).to.be.equal(1);
        expect(res.parameters[0].name).to.be.equal('yo');
        return done();
      }
      done(err);
    });
	});

	it('should be added to the database with multiple parameters', done => {
    compensation.add('compensationId2', 'update', 2, { name: 'hi' });
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
        return done();
      }
      done(err);
    })
	});

  it('should return a promise when added', done => {
    compensation
      .add('compensationIdxyz', 'create', { id: 1, name: 'yo' })
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
    compensation.add('compensationId3', 'create', { id: 2, name: 'yo' });
    compensation
      .run('compensationId3')
      .then(res => done())
      .catch(err => done(err));
	 });

	it('should be called with multiple parameters', done => {
    compensation.add('compensationId4', 'update', 1, { name: 'yes' });
    compensation
      .run('compensationId4')
      .then(res => done())
      .catch(err => done(err));
	});
});
