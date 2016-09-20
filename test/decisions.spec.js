import chai from 'chai';
import { MongoClient, ObjectId } from 'mongodb';
import * as Decisions from '../decisions';

chai.should();

let db;

before(() => MongoClient.connect('mongodb://localhost:27017/testing')
  .then(conn => {
    db = conn;
  })
);

describe('Decisions Service', () => {
  const decisions = [
    { _id: new ObjectId() },
    { _id: new ObjectId() },
    { _id: new ObjectId() },
  ];

  before(() => db.collection('decisions').insert(decisions));

  after(() => db.collection('decisions').remove({}));

  it(
    'should load decisions from database',
    () => Decisions.load(db)
      .then(res => {
        res.should.have.length(3);
      })
  );

  it(
    'should update decision in database',
    () => Decisions.update(db, Object.assign({}, { _id: decisions[0]._id, title: 'test' }))
      .then(res => {
        res.should.have.property('title').equal('test');
      })
  );

  it(
    'should create decision in database',
    () => Decisions.create(db, Object.assign({}, { title: 'test' }))
      .then(res => {
        res.should.have.property('title').equal('test');
      })
  );
});
