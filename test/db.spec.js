import chai from 'chai';
import { MongoClient, ObjectId } from 'mongodb';
import * as Polls from '../db';

chai.should();

let db;

before(() => MongoClient.connect('mongodb://localhost:27017/testing')
  .then(conn => {
    db = conn;
  })
);

describe('Polls Service', () => {
  const polls = [
    { _id: new ObjectId() },
    { _id: new ObjectId() },
    { _id: new ObjectId() },
  ];

  before(() => db.collection('polls').insert(polls));

  after(() => db.collection('polls').remove({}));

  it(
    'should load polls from database',
    () => Polls.load(db)
      .then(res => {
        res.should.have.length(3);
      })
  );

  it(
    'should update poll in database',
    () => Polls.update(db, Object.assign({}, { _id: polls[0]._id, title: 'test' }))
      .then(res => {
        res.should.have.property('title').equal('test');
      })
  );

  it(
    'should create poll in database',
    () => Polls.create(db, Object.assign({}, { title: 'test' }))
      .then(res => {
        res.should.have.property('title').equal('test');
      })
  );
});
