import debug from 'debug';
import express from 'express';
import * as dbModule from '../../database.js';
import { newId } from '../../database.js';
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
router.get('/list', async (req, res, next) => {
  try {
    const bugs = await dbModule.findAllBugs();
    res.json(bugs);
  } catch (err) {
    next(err);
  }
});
// get one bug by ID
router.get('/:bugId', validId('bugId'), async (req, res, next) => {
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
router.put('/new', validBody(newBugSchema), async (req, res, next) => {
  try {
    const newBug = req.body;
    newBug._id = newId();

    await dbModule.insertOneBug(newBug);
    res.status(200).json({ message: `New bug reported, ${newBug._id}` });
  } catch (err) {
    next(err);
  }
});
// update bug
router.put('/:bugId', validId('bugId'), validBody(updateBugSchema), async (req, res, next) => {
  try {
    const bugId = req.bugId;
    const update = req.body;

    const bug = await dbModule.findBugById(bugId);
    if (!bug) {
      res.status(404).json({ error: `Bug ${bugId} not found.` });
    } else if (
      update.title === bug.title ||
      update.description === bug.description ||
      update.stepsToReproduce === bug.stepsToReproduce
    ) {
      res.status(400).json({ error: `Duplicate data not allowed.` });
    } else {
      await dbModule.updateOneBug(bugId, update);
      res.status(200).json({ message: `Bug ${bugId} updated`, bugId });
    }
  } catch (err) {
    next(err);
  }
});
// update class
router.put('/:bugId/classify', validId('bugId'), validBody(updateBugClassSchema), async (req, res, next) => {
  try {
    const bugId = req.bugId;
    const update = req.body;

    const bug = await dbModule.findBugById(bugId);
    if (!bug) {
      res.status(404).json({ error: `Bug ${bugId} not found.` });
    } else {
      update.classifiedOn = new Date();
      await dbModule.updateOneBug(bugId, update);
      res.status(200).json({ message: `Bug ${bugId} classified!`, bugId });
    }
  } catch (err) {
    next(err);
  }
});
// assign to user
router.put('/:bugId/assign', validId('bugId'), validBody(updateBugAssignSchema), async (req, res, next) => {
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
        bug.assignedToUserId = assignedToUserId;
        bug.assignedToUserName = user.fullName;
        await dbModule.updateOneBug(bugId, bug);
        res.status(200).json({ message: `Bug ${bugId} assigned!`, bugId });
      }
    }
  } catch (err) {
    next(err);
  }
});
// close bug
router.put('/:bugId/close', async (req, res, next) => {
  try {
    const bugId = newId(req.params.bugId);
    const bug = await dbModule.findBugById(bugId);

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
        res.status(200).json({ message: `Bug ${bugId} closed!`, bugId });
      } else {
        bug.closedOn = null;
        bug.openedOn = new Date();
        res.status(200).json({ message: `Bug ${bugId} opened!`, bugId });
      }
      await dbModule.updateOneBug(bugId, bug);
    }
  } catch (err) {
    next(err);
  }

  // FIXME: close bug and send response as json
});

export { router as bugRouter };
