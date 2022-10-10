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
const debugMain = debug('app:route:comment');

const router = express.Router();

router.get('/:bugId/comment/list', validId('bugId'), async (req, res, next) => {
  try {
    const bugId = req.bugId;
    const comments = await dbModule.findAllComments(bugId);
    res.status(200).json(comments);
  } catch (err) {
    next(err);
  }
});

export { router as commentRouter };