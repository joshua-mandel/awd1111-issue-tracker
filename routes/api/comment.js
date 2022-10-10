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
import { userRouter } from './user.js';
const debugMain = debug('app:route:comment');

// schemas
const newCommentSchema = Joi.object({
  author: Joi.string().trim().min(24).max(24).required(),
  commentText: Joi.string().trim().min(1).required(),
});

const router = express.Router();

router.get('/:bugId/comment/list', validId('bugId'), async (req, res, next) => {
  try {
    const bugId = req.bugId;
    const bug = await dbModule.findBugById(bugId);
    if (!bug) {
      res.status(404).json({ error: `bug ${bugId} not found.` });
    } else {
      const comments = await dbModule.findAllComments(bugId);
      res.status(200).json(comments);
    }
  } catch (err) {
    next(err);
  }
});

router.get('/:bugId/comment/:commentId', validId('bugId'), validId('commentId'), async (req, res, next) => {
  try {
    const bugId = req.bugId;
    const commentId = req.commentId;
    const bug = await dbModule.findBugById(bugId);
    if(!bug) {
      res.status(404).json({ error: `Bug ${bugId} not found.` });
    } else {
      const comment = await dbModule.findCommentById(bugId, commentId);
      if(!comment) {
        res.status(404).json({ error: `Comment ${commentId} not found.` });
      } else {
        res.status(200).json(comment);
      }
    }
  } catch (err) {
    next(err);
  }
});

// add new comment to bug
router.put('/:bugId/comment/new', validId('bugId'), validBody(newCommentSchema), async (req, res, next) => {
  try {
    const bugId = req.bugId;
    const bug = await dbModule.findBugById(bugId);
    if(!bug) {
      res.status(404).json({ error: `Bug ${bugId} not found.` });
    } else {
      const comment = req.body;
      comment._id = newId();
      comment.submittedOn = new Date();
      if(bug.comments) {
        bug.comments.push(comment);
      } else {
        bug.comments = [comment];
      }
      await dbModule.updateOneBug(bugId, bug);
      res.status(200).json({ message: `Bug Comment ${comment._id.toString()} added!` });
    }
  } catch (err) {
    next(err);
  }
});

export { router as commentRouter };