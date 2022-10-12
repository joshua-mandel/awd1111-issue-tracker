import debug from 'debug';
import express from 'express';
import * as dbModule from '../../database.js';
import { newId } from '../../database.js';
import _ from 'lodash';
import { nanoid } from 'nanoid';
import { ObjectId } from 'mongodb';
import { validId } from '../../middleware/validId.js';
import { validBody } from '../../middleware/validBody.js';
import Joi from 'joi';
import { userRouter } from './user.js';
const debugMain = debug('app:route:test');

// schemas
const newTestSchema = Joi.object({
  status: Joi.any().valid('0', '1').required(),
  createUserId: Joi.string().trim().min(24).max(24).required(),
});

const updateTestSchema = Joi.object({
  status: Joi.any().valid('0', '1').required(),
  updatedByUserId: Joi.string().trim().min(24).max(24).required(),
});

const router = express.Router();

// get all tests in a bug
router.get('/:bugId/test/list', validId('bugId'), async (req, res, next) => {
  try {
    const bugId = req.bugId;
    const bug = await dbModule.findBugById(bugId);
    if (!bug) {
      res.status(404).json({ error: `bug ${bugId} not found.` });
    } else {
      const tests = await dbModule.findAllTests(bugId);
      res.status(200).json(tests);
    }
  } catch (err) {
    next(err);
  }
});

// get a specific test from a bug
router.get('/:bugId/test/:testId', validId('bugId'), validId('testId'), async (req, res, next) => {
  try {
    const bugId = req.bugId;
    const testId = req.testId;
    const bug = await dbModule.findBugById(bugId);
    if (!bug) {
      res.status(404).json({ error: `Bug ${bugId} not found.` });
    } else {
      const test = await dbModule.findTestById(bugId, testId);
      if (!test) {
        res.status(404).json({ error: `Test ${testId} not found.` });
      } else {
        res.status(200).json(test);
      }
    }
  } catch (err) {
    next(err);
  }
});

// add new test to bug
router.put('/:bugId/test/new', validId('bugId'), validBody(newTestSchema), async (req, res, next) => {
  try {
    const bugId = req.bugId;
    const bug = await dbModule.findBugById(bugId);
    if (!bug) {
      res.status(404).json({ error: `Bug ${bugId} not found.` });
    } else {
      const test = req.body;
      test.status = parseInt(test.status);
      test._id = newId();
      test.createdDate = new Date();
      if (bug.tests) {
        bug.tests.push(test);
      } else {
        bug.tests = [test];
      }
      test.createUserId = new ObjectId(test.createUserId);
      const createdUser = await dbModule.findUserById(test.createUserId);
      if (createdUser.role == 'Quality Analyst') {
        test.testCaseAuthor = createdUser.fullName;
        if (!test.status) {
          test.status = 'fail';
        } else {
          test.status = 'pass';
        }
        await dbModule.updateOneBug(bugId, bug);
        res.status(200).json({ message: `Bug Test ${test._id.toString()} added!` });
      } else {
        res.status(400).json({ error: `User ${createdUser._id} is not a Quality Analyst.` });
      }
    }
  } catch (err) {
    next(err);
  }
});

// get a specific test from a bug
router.put(
  '/:bugId/test/:testId',
  validId('bugId'),
  validId('testId'),
  validBody(updateTestSchema),
  async (req, res, next) => {
    try {
      const bugId = req.bugId;
      const testId = req.testId;
      const bug = await dbModule.findBugById(bugId);
      if (!bug) {
        res.status(404).json({ error: `Bug ${bugId} not found.` });
      } else {
        const test = await dbModule.findTestById(bugId, testId);
        if (!test) {
          res.status(404).json({ error: `Test ${testId} not found.` });
        } else {
          const updatedTest = req.body;
          updatedTest.updatedDate = new Date();
          updatedTest.updatedByUserId = new ObjectId(updatedTest.updatedByUserId);
          updatedTest._id = test._id;
          const updatedUser = await dbModule.findUserById(updatedTest.updatedByUserId);
          if (updatedUser.role == 'Quality Analyst') {
            updatedTest.status = parseInt(updatedTest.status);
            if (!updatedTest.status) {
              updatedTest.status = 'fail';
            } else {
              updatedTest.status = 'pass';
            }
            const data = await dbModule.updateOneTest(bugId, updatedTest);
            if (data == 1) {
              res.status(200).json({ message: `Bug Test ${test._id.toString()} updated!` });
            } else {
              res.status(400).json({ error: 'Not Updated.' });
            }
          } else {
            res.status(400).json({ error: `User ${createdUser._id} is not a Quality Analyst.` });
          }
        }
      }
    } catch (err) {
      next(err);
    }
  }
);

// execute a test from a bug
router.put('/:bugId/test/:testId/execute', validId('bugId'), validId('testId'), async (req, res, next) => {
  try {
    const bugId = req.bugId;
    const testId = req.testId;
    const updatedTest = {};
    const bug = await dbModule.findBugById(bugId);
    if (!bug) {
      res.status(404).json({ error: `Bug ${bugId} not found.` });
    } else {
      const test = await dbModule.findTestById(bugId, testId);
      if (!test) {
        res.status(404).json({ error: `Test ${testId} not found.` });
      } else {
        updatedTest.executedTest = Math.round(Math.random());
        if (!updatedTest.executedTest) {
          updatedTest.executedTest = 'execute failed';
        } else {
          updatedTest.executedTest = 'execute passed';
        }
        updatedTest._id = test._id;
        updatedTest.status = parseInt(updatedTest.status);
        if (!updatedTest.status) {
          updatedTest.status = 'fail';
        } else {
          updatedTest.status = 'pass';
        }
        await dbModule.executeOneTest(bugId, updatedTest);
        res.status(200).json({ message: `Bug Test ${test._id.toString()} executed!` });
      }
    }
  } catch (err) {
    next(err);
  }
});

// delete a test from a bug
router.delete('/:bugId/test/:testId', validId('bugId'), validId('testId'), async (req, res, next) => {
  try {
    const bugId = req.bugId;
    const testId = req.testId;
    const bug = await dbModule.findBugById(bugId);

    if (!bug) {
      res.status(404).json({ error: `Bug ${bugId} not found.` });
    } else {
      const test = await dbModule.findTestById(bugId, testId);
      if (!test) {
        res.status(404).json({ error: `Test ${testId} not found.` });
      } else {
        await dbModule.deleteOneTest(bugId, test)
        res.status(200).json({ message: `Test ${testId} deleted.`})
      }
    }
  } catch (err) {
    next(err);
  }
})

export { router as testRouter };
