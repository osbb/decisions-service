import amqp from 'amqplib';
import { MongoClient, ObjectId } from 'mongodb';
import winston from 'winston';

const rabbitmqHost = process.env.RABBITMQ_PORT_5672_TCP_ADDR || 'localhost';
const rabbitmqPort = process.env.RABBITMQ_PORT_5672_TCP_PORT || 5672;

const mongoHost = process.env.MONGO_PORT_27017_TCP_ADDR || 'localhost';
const mongoPort = process.env.MONGO_PORT_27017_TCP_PORT || 27017;
const connection = MongoClient.connect(`mongodb://${mongoHost}:${mongoPort}`); // connection promise
const decisionsCollectionPromise = connection.then(db => db.collection('decisions'));

function loadDecisions() {
  return decisionsCollectionPromise
    .then(c => c.find({}).toArray());
}

function updateDecision({ decision }) {
  const { title, answer } = decision;

  return decisionsCollectionPromise
    .then(c => c.updateOne({ _id: ObjectId(decision._id) }, { $set: { title, answer } }))
    .then(() => decisionsCollectionPromise
      .then(c => c.findOne({ _id: ObjectId(decision._id) }, {}))
    );
}

function createDecision({ decision }) {
  const { title, answer } = decision;

  return decisionsCollectionPromise
    .then(c => c.insertOne({ title, answer }, {}))
    .then(res => decisionsCollectionPromise
      .then(c => c.findOne({ _id: ObjectId(res.insertedId) }, {}))
    );
}

amqp.connect(`amqp://${rabbitmqHost}:${rabbitmqPort}`)
  .then(conn => conn.createChannel())
  .then(ch => {
    ch.assertQueue('events', { durable: true });
    ch.prefetch(1);

    ch.consume('events', msg => {
      let event;

      try {
        event = JSON.parse(msg.content.toString());
      } catch (err) {
        winston.error(err, msg.content.toString());
        return;
      }

      switch (event.type) {
        case 'LOAD_DECISIONS':
          loadDecisions(ch, event)
            .then(data => {
              ch.sendToQueue(
                msg.properties.replyTo,
                new Buffer(JSON.stringify({ type: 'LOAD_DECISIONS', data })),
                { correlationId: msg.properties.correlationId }
              );
              ch.ack(msg);
            });
          break;
        case 'UPDATE_DECISION':
          updateDecision(event)
            .then(data => {
              ch.sendToQueue(
                msg.properties.replyTo,
                new Buffer(JSON.stringify({ type: 'UPDATE_DECISION', data })),
                { correlationId: msg.properties.correlationId }
              );
              ch.ack(msg);
            });
          break;
        case 'CREATE_DECISION':
          createDecision(event)
            .then(data => {
              ch.sendToQueue(
                msg.properties.replyTo,
                new Buffer(JSON.stringify({ type: 'CREATE_DECISION', data })),
                { correlationId: msg.properties.correlationId }
              );
              ch.ack(msg);
            });
          break;
        default:
          ch.nack(msg);
          return;
      }
    }, { noAck: false });
  });
