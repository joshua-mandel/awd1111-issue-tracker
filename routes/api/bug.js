import debug from 'debug';
const debugMain = debug('app:route:user');
import express from 'express';
import moment from 'moment';
import _ from 'lodash';
import { nanoid } from 'nanoid';

// FIXME: use this array to store bug data in for now
// we ll replace this with a database in a later assignment
const bugsArray = [];

// create router
const router = express.Router();

// register routes
router.get('/list', (req, res, next) => {
  res.json(bugsArray);
});
router.get('/:bugId', (req, res, next) => {
  const bugId = req.params.bugId;
  // FIXME: get bug from bugsArray and send response as json
});
router.put('/new', (req, res, next) => {
  // FIXME: create new bug and send response as json
});
router.put('/:bugId', (req, res, next) => {
  // FIXME: update existing bug and send response as json
});
router.put('/:bugId/classify', (req, res, next) => {
  // FIXME: classify bug and send response as json
});
router.put('/:bugId/assign', (req, res, next) => {
  // FIXME: assign bug to a yser and send response as json
});
router.put('/:bugId/close', (req, res, next) => {
  // FIXME: close bug and send response as json
});

export { router as bugRouter };
