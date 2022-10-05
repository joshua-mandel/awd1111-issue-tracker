import { MongoClient, ObjectId, Db } from 'mongodb';
import config from 'config';
import debug from 'debug';
const debugDatabase = debug('app:database');

/** Generate/Parse an ObjectId */
const newId = (str) => ObjectId(str);

/** Global variable storing the open connection, do not use it directly. */
let _db = null;

/** Connect to the database */
async function connect() {
  if (!_db) {
    const dbUrl = config.get('db.url');
    const dbName = config.get('db.name');
    const client = await MongoClient.connect(dbUrl);
    _db = client.db(dbName);
    debugDatabase('Connected.');
  }
  return _db;
}

/** Connect to the database and verify the connection */
async function ping() {
  const db = await connect();
  await db.command({ ping: 1 });
  debugDatabase('Ping.');
}

// FIXME: add more functions here
async function findAllUsers() {
  const db = await connect();
  const users = await db.collection('user').find({}).toArray();
  return users;
}

async function findAllBugs() {
  const db = await connect();
  const bugs = await db.collection('issue').find({}).toArray();
  return bugs;
}

async function findUserIdByEmail(email) {
  const db = await connect();
  const user = await db.collection('user').findOne({ _email: { $eq: emailAddress } });
  return user._id;
}

async function findUserById(userId) {
  const db = await connect();
  const user = await db.collection('user').findOne({ _id: { $eq: userId } });
  return user;
}

async function findBugById(bugId) {
  const db = await connect();
  const bug = await db.collection('issue').findOne({ _id: { $eq: bugId } });
  return bug;
}

async function insertOneUser(user) {
  const db = await connect();
  await db.collection('user').insertOne({
    ...user,
    fullName: user.givenName + ' ' + user.familyName,
    createdDate: new Date(),
  });
}

async function insertOneBug(bug) {
  const db = await connect();
  await db.collection('issue').insertOne({
    ...bug,
    createdDate: new Date(),
  });
}

async function findUserByEmail(newEmail) {
  const db = await connect();
  const userFound = await db.collection('user').findOne({ emailAddress: { $eq: newEmail } });
  return userFound;
}

async function login(emailAddress, password) {
  const db = await connect();
  const userLoggedIn = await db.collection('user').findOne({
    emailAddress: { $eq: emailAddress },
    password: { $eq: password },
  });
  return userLoggedIn;
}

async function updateOneUser(userId, update) {
  const db = await connect();
  const user = await db.collection('user').updateOne(
    {
      _id: { $eq: userId },
    },
    {
      $set: {
        ...update,
        lastUpdated: new Date(),
      },
    }
  );
}

async function updateOneBug(bugId, update) {
  const db = await connect();
  const bug = await db.collection('issue').updateOne(
    {
      _id: { $eq: bugId },
    },
    {
      $set: {
        ...update,
        lastUpdated: new Date(),
      },
    }
  );
}

async function deleteOneUser(userId) {
  const db = await connect();
  const user = await db.collection('user').deleteOne({
    _id: { $eq: userId },
  });
}

// export functions
export {
  newId,
  connect,
  ping,
  findAllUsers,
  findUserById,
  insertOneUser,
  findUserByEmail,
  findUserIdByEmail,
  login,
  updateOneUser,
  deleteOneUser,
  findAllBugs,
  findBugById,
  insertOneBug,
  updateOneBug,
};

// test the database connection
ping();
