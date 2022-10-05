import debug from 'debug';
const debugMain = debug('app:route:user');
import express from 'express';
import * as dbModule from '../../database.js';
import { newId } from '../../database.js';
import moment from 'moment';
import _ from 'lodash';
import { nanoid } from 'nanoid';
import { ObjectId } from 'mongodb';

// FIXME: use this array to store bug data in for now
// we ll replace this with a database in a later assignment

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
// get one bug by id
router.get('/:bugId', async (req, res, next) => {
  try {
    const bugId = newId(req.params.bugId);
    const bug = await dbModule.findBugById(bugId);
    if (!bug) {
      res.status(404).json({ error: `${bugId} not found.` });
    } else {
      res.status(200).json(bug);
    }
  } catch (err) {
    next(err);
  }
});
// new bug
router.put('/new', async (req, res, next) => {
  try {
    const newBug = {
      _id: new ObjectId(),
      title: req.body.title,
      description: req.body.description,
      stepsToReproduce: req.body.stepsToReproduce,
    };
    if (!newBug.title) {
      res.status(400).json({ error: 'Title Required!' });
    } else if (!newBug.description) {
      res.status(400).json({ error: 'Description Required!' });
    } else if (!newBug.stepsToReproduce) {
      res.status(400).json({ error: 'Steps to Reproduce Required!' });
    } else {
      await dbModule.insertOneBug(newBug);
      res.status(200).json({ message: `New bug reported, ${newBug._id}` });
    }
  } catch (err) {
    next(err);
  }
});
// update bug
router.put('/:bugId', async (req, res, next) => {
  try {
    const bugId = newId(req.params.bugId);
    const bug = await dbModule.findBugById(bugId);

    if (!bug) {
      res.status(404).json({ error: `Bug ${bugId} not found.` });
    } else {
      const { title, description, stepsToReproduce } = req.body;
      if (title != undefined) {
        bug.title = title;
      }
      if (description != undefined) {
        bug.description = description;
      }
      if (stepsToReproduce != undefined) {
        bug.stepsToReproduce = stepsToReproduce;
      }
      await dbModule.updateOneBug(bugId, bug);

      res.status(200).json({ message: `Bug ${bugId} updated`, bugId });
    }
  } catch (err) {
    next(err);
  }
});
// update class
router.put('/:bugId/classify', async (req, res, next) => {
  try {
    const bugId = newId(req.params.bugId);
    const bug = await dbModule.findBugById(bugId);

    if (!bug) {
      res.status(404).json({ error: `Bug ${bugId} not found.` });
    } else {
      const { bugClass } = req.body;
      if (!bugClass) {
        res.status(400).json({ error: `Please include bugClass.` });
      } else {
        bug.bugClass = bugClass;
        bug.classifiedOn = new Date();
        await dbModule.updateOneBug(bugId, bug);
        res.status(200).json({ message: `Bug ${bugId} classified!`, bugId });
      }
    }
  } catch (err) {
    next(err);
  }
});
// assign to user
router.put('/:bugId/assign', async (req, res, next) => {
  try {
    const bugId = newId(req.params.bugId);
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
router.put('/:bugId/close', (req, res, next) => {
  const bugId = req.params.bugId;
  const { closed } = req.body;
  const bug = bugsArray.find((x) => x._id == bugId);

  if (!bug) {
    res.status(404).json({ error: 'Bug Not Found!' });
  } else {
    if (closed == 'close') {
      bug.closed = true;
    } else if (closed == 'open') {
      bug.closed = false;
    } else {
      res.status(400).json({ error: 'Please enter close or open!' });
    }
    bug.updatedDate = new Date();

    res.json(bug);
  }
  // FIXME: close bug and send response as json
});

export { router as bugRouter };
