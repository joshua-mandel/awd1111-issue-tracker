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
  const bugs = await db.collection('issue.comment').find({}).toArray();
  return bugs;
}

async function findAllComments(bugId) {
  const db = await connect();
  const foundBug = await findBugById(bugId);
  //const comments = await db.collection('issue').find({})
  debugDatabase(foundBug.comments);
  return foundBug.comments;
}

async function findAllTests(bugId) {
  const db = await connect();
  const foundBug = await findBugById(bugId);
  debugDatabase(foundBug.tests);
  return foundBug.tests;
}

async function findUserIdByEmail(emailAddress) {
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

async function findCommentById(bugId, commentId) {
  const db = await connect();
  const bug = await db.collection('issue').findOne({ _id: { $eq: bugId } });
  const bugComment = bug.comments.find((comments) => comments._id.toString() == commentId);
  return bugComment;
}

async function findTestById(bugId, testId) {
  const db = await connect();
  const bug = await db.collection('issue').findOne({ _id: { $eq: bugId } });
  const bugTest = bug.tests.find((tests) => tests._id.toString() == testId);
  return bugTest;
}

async function insertOneUser(user) {
  const db = await connect();
  await db.collection('user').insertOne({
    ...user,
    fullName: user.givenName + ' ' + user.familyName,
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

async function updateOneTest(bugId, updatedBugTestCase) {
  const db = await connect();
  debugDatabase(updatedBugTestCase._id);
  const data = await db.collection('issue').updateOne(
    { _id: { $eq: bugId }, 'tests._id': { $eq: updatedBugTestCase._id } },
    {
      $set: { 'tests.$.status': updatedBugTestCase.status, 'tests.$.lastUpdated': new Date() },
    }
  );
  return data.modifiedCount;
}

async function executeOneTest(bugId, executeBugTestCase) {
  const db = await connect();
  const data = await db.collection('issue').updateOne(
    { _id: { $eq: bugId }, 'tests._id': { $eq: executeBugTestCase._id } },
    {
      $set: { 'tests.$.executedTest': executeBugTestCase.executedTest, 'tests.$.lastUpdated': new Date() },
    }
  );
  return data.modifiedCount;
}

async function deleteOneUser(userId) {
  const db = await connect();
  await db.collection('user').deleteOne({
    _id: { $eq: userId },
  });
}

async function deleteOneTest(bugId, deletedTestCase) {
  const db = await connect();
  await db
    .collection('issue')
    .updateMany({ _id: { $eq: bugId } }, { $pull: { tests: { _id: { $eq: deletedTestCase._id } } } });
}

async function saveEdit(edit) {
  const db = await connect();
  return await db.collection('edits').insertOne(edit);
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
  findAllComments,
  findCommentById,
  findAllTests,
  findTestById,
  updateOneTest,
  executeOneTest,
  deleteOneTest,
  saveEdit,
};

// test the database connection
ping();
