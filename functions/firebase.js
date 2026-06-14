const admin = require('firebase-admin');
const functions = require('firebase-functions/v1');
const { REGION } = require('./constants');

admin.initializeApp();

const db = admin.database();
const bucket = admin.storage().bucket();

const callableRuntime = functions.region(REGION).runWith({
  maxInstances: 3,
});

module.exports = {
  admin,
  db,
  bucket,
  callableRuntime,
};
