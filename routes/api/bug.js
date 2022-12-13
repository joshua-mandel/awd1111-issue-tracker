import debug from 'debug';
import express from 'express';
import { hasPermission, isLoggedIn, hasAnyRole, hasRole } from '@merlin4/express-auth';
import * as dbModule from '../../database.js';
import { newId, connect } from '../../database.js';
import moment from 'moment';
import _ from 'lodash';
import { nanoid } from 'nanoid';
import { ObjectId } from 'mongodb';
import { validId } from '../../middleware/validId.js';
import { validBody } from '../../middleware/validBody.js';
import Joi from 'joi';
const debugMain = debug('app:route:bug');

// new bug schema
const newBugSchema = Joi.object({
  title: Joi.string().trim().min(1).required(),
  description: Joi.string().trim().min(1).required(),
  stepsToReproduce: Joi.string().trim().min(1).required(),
});

// update bug schema
const updateBugSchema = Joi.object({
  title: Joi.string().trim().min(1),
  description: Joi.string().trim().min(1),
  stepsToReproduce: Joi.string().trim().min(1),
}).min(1);

// update bug class schema
const updateBugClassSchema = Joi.object({
  bugClass: Joi.string().trim().min(1),
}).min(1);

// update bug assign schema
const updateBugAssignSchema = Joi.object({
  assignedToUserId: Joi.string().trim().min(1).required(),
}).min(1);

// create router
const router = express.Router();

// register routes
// get all bugs
router.get('/list', isLoggedIn(), async (req, res, next) => {
  try {
    // get inputs
    let { keywords, bugClass, maxAge, minAge, open, closed, sortBy, pageNumber, pageSize } = req.query;

    debugMain(req.query);
    minAge = parseInt(minAge);
    maxAge = parseInt(maxAge);

    const now = new Date(); // get the current date and time

    const today = new Date(); // get the current date and clear out the time
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);

    const pastMin = new Date(today); // make a copy of today
    pastMin.setDate(pastMin.getDate() - minAge - 1); // set the date back to the value in minAge

    const pastMax = new Date(today);
    pastMax.setDate(pastMax.getDate() - maxAge);

    // match stage
    const match = {};
    if (keywords) {
      match.$text = { $search: keywords };
    }
    if (bugClass) {
      match.bugClass = { $eq: bugClass };
    }
    if (open && !closed) {
      match.closed = { $eq: false };
    }
    if (closed && !open) {
      match.closed = { $eq: true };
    }
    if (minAge && maxAge) {
      match.createdDate = { $lt: pastMin, $gte: pastMax };
    } else if (minAge) {
      match.createdDate = { $lt: pastMin };
    } else if (maxAge) {
      match.createdDate = { $gte: pastMax };
    }

    // sort stage
    let sort = { createdDate: -1 };
    switch (sortBy) {
      case 'newest':
        sort = { createdDate: -1 };
        break;
      case 'oldest':
        sort = { createdDate: 1 };
        break;
      case 'title':
        sort = { title: 1, createdDate: -1 };
        break;
      case 'classification':
        sort = { bugClass: 1, createdDate: -1 };
        break;
      case 'assignedTo':
        sort = { assignedToUserName: 1, createdDate: -1 };
        break;
      case 'createdBy':
        sort = { createdByUserName: 1, createdDate: -1 };
        break;
    }

    // project stage
    const project = { title: 1, bugClass: 1, closed: 1, createdDate: 1, createdBy: 1 };

    // skip & limit stages
    pageNumber = parseInt(pageNumber) || 1;
    pageSize = parseInt(pageSize) || 5;
    const skip = (pageNumber - 1) * pageSize;
    const limit = pageSize;

    // pipeline
    const pipeline = [{ $match: match }, { $sort: sort }, { $project: project }, { $skip: skip }, { $limit: limit }];

    const db = await connect();
    const cursor = db.collection('issue').aggregate(pipeline);
    const results = await cursor.toArray();

    res.json(results);
  } catch (err) {
    next(err);
  }
});
// get one bug by ID
router.get('/:bugId', validId('bugId'), isLoggedIn(), async (req, res, next) => {
  try {
    const bugId = req.bugId;
    const bug = await dbModule.findBugById(bugId);
    if (!bug) {
      res.status(404).json({ error: `Bug ${bugId} not found.` });
    } else {
      res.status(200).json(bug);
    }
  } catch (err) {
    next(err);
  }
});
// new bug
router.put('/new', isLoggedIn(), validBody(newBugSchema), async (req, res, next) => {
  try {
    const newBug = {
      ...req.body,
      _id: newId(),
      createdDate: new Date(),
      createdById: newId(req.auth._id),
      createdBy: req.auth.fullName,
      bugClass: 'unclassified',
      closed: false,
    };

    const bugId = newBug._id;

    await dbModule.insertOneBug(newBug);

    const edit = {
      timestamp: new Date(),
      op: 'insert',
      col: 'issue',
      target: { bugId },
      update: newBug,
      auth: req.auth,
    };
    await dbModule.saveEdit(edit);

    res.status(200).json({ message: `New bug reported, ${newBug._id}`, bugId: newBug._id });
  } catch (err) {
    next(err);
  }
});
// update bug
router.put('/:bugId', isLoggedIn(), validId('bugId'), validBody(updateBugSchema), async (req, res, next) => {
  try {
    const bugId = req.bugId;
    const update = req.body;
    update.lastUpdatedOn = new Date();
    update.lastUpdatedBy = newId(req.auth._id);

    const bug = await dbModule.findBugById(bugId);
    if (!bug) {
      res.status(404).json({ error: `Bug ${bugId} not found.` });
    } else {
      await dbModule.updateOneBug(bugId, update);

      const edit = {
        timestamp: new Date(),
        op: 'update',
        col: 'issue',
        target: { bugId },
        update,
        auth: req.auth,
      };
      await dbModule.saveEdit(edit);

      res.status(200).json({ message: `Bug ${bugId} updated`, bugId });
    }
  } catch (err) {
    next(err);
  }
});
// update class
router.put(
  '/:bugId/classify',
  hasRole('Business Analyst'),
  validId('bugId'),
  validBody(updateBugClassSchema),
  async (req, res, next) => {
    try {
      if (!req.auth) {
        return res.status(401).json({ error: 'You must be logged in!' });
      }
      const bugId = req.bugId;
      const update = req.body;

      const bug = await dbModule.findBugById(bugId);
      if (!bug) {
        res.status(404).json({ error: `Bug ${bugId} not found.` });
      } else {
        update.classifiedOn = new Date();
        update.classifiedBy = newId(req.auth._id);
        await dbModule.updateOneBug(bugId, update);

        const edit = {
          timestamp: new Date(),
          op: 'update',
          col: 'issue',
          target: { bugId },
          update,
          auth: req.auth,
        };
        await dbModule.saveEdit(edit);

        res.status(200).json({ message: `Bug ${bugId} classified!`, bugId });
      }
    } catch (err) {
      next(err);
    }
  }
);
// assign to user
router.put(
  '/:bugId/assign',
  validId('bugId'),
  isLoggedIn(),
  validBody(updateBugAssignSchema),
  async (req, res, next) => {
    try {
      const bugId = req.bugId;
      const assignedToUserId = newId(req.body.assignedToUserId);
      const user = await dbModule.findUserById(assignedToUserId);
      const bug = await dbModule.findBugById(bugId);

      if (!bug) {
        res.status(404).json({ error: `Bug ${bugId} not found.` });
      } else {
        if (!user) {
          res.status(404).json({ error: `Please include a valid assignedToUserId.` });
        } else {
          bug.assignedOn = new Date();
          bug.assignedBy = newId(req.auth._id);
          bug.assignedToUserId = assignedToUserId;
          bug.assignedToUserName = user.emailAddress;
          await dbModule.updateOneBug(bugId, bug);

          const edit = {
            timestamp: new Date(),
            op: 'update',
            col: 'issue',
            target: { bugId },
            update: bug.assignedToUserId,
            auth: req.auth,
          };
          await dbModule.saveEdit(edit);

          res.status(200).json({ message: `Bug ${bugId} assigned!`, bugId });
        }
      }
    } catch (err) {
      next(err);
    }
  }
);
// close bug
router.put('/:bugId/close', isLoggedIn(), async (req, res, next) => {
  try {
    const bugId = newId(req.params.bugId);
    const bug = await dbModule.findBugById(bugId);
    const update = req.body;

    if (!bug) {
      res.status(404).json({ error: `Bug ${bugId} not found.` });
    } else {
      const { closed } = req.body;
      if (closed == 'close') {
        bug.closed = true;
      } else if (closed == 'open') {
        bug.closed = false;
      } else {
        res.status(400).json({ error: 'Please enter close or open!' });
      }
      if (bug.closed == true) {
        bug.closedOn = new Date();
        bug.closedBy = newId(req.auth._id);
        await dbModule.updateOneBug(bugId, bug);
        res.status(200).json({ message: `Bug ${bugId} closed!`, bugId });
      } else {
        bug.closedOn = null;
        bug.closedBy = null;
        await dbModule.updateOneBug(bugId, bug);
        res.status(200).json({ message: `Bug ${bugId} opened!`, bugId });
      }

      const edit = {
        timestamp: new Date(),
        op: 'update',
        col: 'issue',
        target: { bugId },
        update,
        auth: req.auth,
      };
      await dbModule.saveEdit(edit);
    }
  } catch (err) {
    next(err);
  }
});

export { router as bugRouter };
