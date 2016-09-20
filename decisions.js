import { ObjectId } from 'mongodb';

export function load(db) {
  return db.collection('decisions').find({}).toArray();
}

export function update(db, decision) {
  const { title, answer } = decision;

  return db.collection('decisions')
    .updateOne({ _id: ObjectId(decision._id) }, { $set: { title, answer } })
    .then(() => db.collection('decisions').findOne({ _id: ObjectId(decision._id) }, {}));
}

export function create(db, decision) {
  const { title, answer } = decision;

  return db.collection('decisions')
    .insertOne({ title, answer }, {})
    .then(res => db.collection('decisions').findOne({ _id: ObjectId(res.insertedId) }, {}));
}
