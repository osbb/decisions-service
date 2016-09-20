import amqp from 'amqplib';
import { MongoClient } from 'mongodb';
import winston from 'winston';
import * as Decisions from './decisions';

const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
const connection = MongoClient.connect(mongoUrl); // connection promise

const connectToRabbitMQ = new Promise(resolve => {
  function openConnection() {
    winston.info('Connecting to RabbitMQ...');
    amqp.connect(rabbitmqUrl)
      .then(conn => {
        winston.info('Connected!');
        resolve(conn);
      })
      .catch(() => {
        winston.info('Connection failure. Retry in 5 sec.');
        setTimeout(() => {
          openConnection();
        }, 5000);
      });
  }

  openConnection();
});

connectToRabbitMQ
  .then(conn => conn.createChannel())
  .then(ch => {
    ch.assertExchange('events', 'topic', { durable: true });
    ch.assertQueue('decisions-service', { durable: true })
      .then(q => {
        ch.prefetch(1);
        ch.bindQueue(q.queue, 'events', 'decisions.*');

        ch.consume(q.queue, msg => {
          let data;

          try {
            data = JSON.parse(msg.content.toString());
          } catch (err) {
            winston.error(err, msg.content.toString());
            return;
          }

          switch (msg.fields.routingKey) {
            case 'decisions.load':
              connection
                .then(db => Decisions.load(db))
                .then(decisions => {
                  ch.sendToQueue(
                    msg.properties.replyTo,
                    new Buffer(JSON.stringify(decisions)),
                    { correlationId: msg.properties.correlationId }
                  );
                  ch.ack(msg);
                });
              break;
            case 'decisions.update':
              connection
                .then(db => Decisions.update(db, data))
                .then(decision => {
                  ch.sendToQueue(
                    msg.properties.replyTo,
                    new Buffer(JSON.stringify(decision)),
                    { correlationId: msg.properties.correlationId }
                  );
                  ch.ack(msg);
                });
              break;
            case 'decisions.create':
              connection
                .then(db => Decisions.create(db, data))
                .then(decision => {
                  ch.sendToQueue(
                    msg.properties.replyTo,
                    new Buffer(JSON.stringify(decision)),
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
  });
