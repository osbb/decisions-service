import { ObjectId } from 'mongodb';

export function load(db) {
  return db.collection('decisions').find({}).toArray();
}

export function update(db, decision) {
  return db.collection('decisions')
    .updateOne({ _id: ObjectId(decision._id) }, { $set: decision })
    .then(() => db.collection('decisions').findOne({ _id: ObjectId(decision._id) }, {}));
}

export function create(db, decision) {
  return db.collection('decisions')
    .insertOne(decision, {})
    .then(res => db.collection('decisions').findOne({ _id: ObjectId(res.insertedId) }, {}));
}
