import debug from 'debug';
import express from 'express';
import config from 'config';
import * as dbModule from '../../database.js';
import { newId, connect } from '../../database.js';
import moment from 'moment';
import _ from 'lodash';
import { nanoid } from 'nanoid';
import { ObjectId } from 'mongodb';
import { validId } from '../../middleware/validId.js';
import { validBody } from '../../middleware/validBody.js';
import { hasPermission, isLoggedIn, hasAnyRole, hasRole } from '@merlin4/express-auth';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
const debugMain = debug('app:route:user');

// new user schema
const newUserSchema = Joi.object({
  emailAddress: Joi.string().trim().min(1).email().required(),
  password: Joi.string().trim().min(1).required(),
  givenName: Joi.string().trim().min(1).required(),
  familyName: Joi.string().trim().min(1).required(),
});

// login schema
const loginUserSchema = Joi.object({
  emailAddress: Joi.string().trim().min(1).email().required(),
  password: Joi.string().trim().min(1).required(),
});

// update user schema
const updateUserSchema = Joi.object({
  emailAddress: Joi.string().trim().min(1).email(),
  password: Joi.string().trim().min(1),
  givenName: Joi.string().trim().min(1),
  familyName: Joi.string().trim().min(1),
  role: Joi.string()
    .trim()
    .min(1)
    .lowercase()
    .valid('developer', 'quality analyst', 'business analyst', 'technical manager', 'product manager'),
}).min(1);

async function issueAuthToken(user) {
  const authPayload = {
    _id: user._id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  };

  // get role names
  const roleNames = Array.isArray(user.role) ? user.role : [user.role];

  // get all of the roles in parallel
  const roles = await Promise.all(
    roleNames.map((roleName) => dbModule.findRoleByName(roleName))
  );

  // combine the permission tables
  const permissions = {};
  for (const role of roles) {
    if (role && role.permissions) {
      for (const permission in role.permissions) {
        if (role.permissions[permission] === true) {
          permissions[permission] = true;
        }
      }
    }
  }

  // update the token payload
  authPayload.permissions = permissions;

  // issue token
  const authSecret = config.get('auth.secret');
  const authOptions = { expiresIn: config.get('auth.tokenExpiresIn') };
  const authToken = jwt.sign(authPayload, authSecret, authOptions);
  return authToken;
}

function setAuthCookie(res, authToken) {
  const cookieOptions = {
    httpOnly: true,
    maxAge: parseInt(config.get('auth.cookieMaxAge')),
  };
  res.cookie('authToken', authToken, cookieOptions);
}
// create router
const router = express.Router();

//register routes
// get all users
router.get('/list', hasRole(), async (req, res, next) => {
  try {
    if (!req.auth) {
      return res.status(401).json({ error: 'You must be logged in!' });
    }
    // get inputs
    let { keywords, role, maxAge, minAge, sortBy, pageNumber, pageSize } = req.query;

    debugMain(req.query);
    minAge = parseInt(minAge);
    maxAge = parseInt(maxAge);

    // match stage
    const match = {};
    if (keywords) {
      match.$text = { $search: keywords };
    } if (role) {
      match.role = { $eq: role };
    } if (minAge && maxAge) {
      match.createdDate = { $gte: new Date(minAge), $lte: new Date(maxAge) };
    } else if(minAge) {
      match.createdDate = { $gte: new Date(minAge) };
    } else if(maxAge) {
      match.createdDate = { $lte: new Date(maxAge) };
    }

    // sort stage
    let sort = { givenName: 1, familyName: 1, createdDate: 1 };
    switch (sortBy) {
      case 'givenName': sort = { givenName: 1, familyName: 1, createdDate: 1 }; break;
      case 'familyName': sort = { familyName: 1, givenName: 1, createdDate: 1 }; break;
      case 'role': sort = { role: 1, givenName: 1, familyName: 1, createdDate: 1 }; break;
      case 'newest': sort = { createdDate: -1 }; break;
      case 'oldest' : sort = { createdDate: 1 }; break;
    }

    // project stage
    const project = { givenName: 1, familyName: 1, role: 1 };

    // skip & limit stages
    pageNumber = parseInt(pageNumber) || 1;
    pageSize = parseInt(pageSize) || 5;
    const skip = (pageNumber - 1) * pageSize;
    const limit = pageSize;

    // pipeline
    const pipeline = [
      { $match: match },
      { $sort: sort },
      { $project: project },
      { $skip: skip },
      { $limit: limit },
    ];

    const db = await connect();
    const cursor = db.collection('user').aggregate(pipeline);
    const results = await cursor.toArray();

    res.json(results);
  } catch (err) {
    next(err);
  }
});
// get your own info
router.get('/me', async (req, res, next) => {
  try {

    const userId = newId(req.auth._id);
    const user = await dbModule.findUserById(userId);
    if (!user) {
      res.status(404).json({ error: `User ${userId} not found.` });
    } else {
      res.status(200).json(user);
    }

  } catch (err) {
    next(err);
  }
})
// update your own info
router.put('/me', validBody(updateUserSchema), async (req, res, next) => {
  try {
    if (!req.auth) {
      return res.status(401).json({ error: 'You must be logged in!' });
    }

    const userId = newId(req.auth._id);
    const user = await dbModule.findUserById(userId);
    const update = req.body;
    if (update) {
      update.lastUpdatedOn = new Date();
      update.lastUpdatedBy = newId(req.auth._id);
    }

    if (update.password) {
      const saltRounds = parseInt(config.get('auth.saltRounds'));
      update.password = await bcrypt.hash(update.password, saltRounds);
    }

    if (!user) {
      res.status(404).json({ error: `User ${userId} not found.` });
    } else if (
      update.emailAddress === user.emailAddress ||
      update.password === user.password ||
      update.givenName === user.givenName ||
      update.familyName === user.familyName ||
      update.role === user.role
    ) {
      res.status(400).json({ error: `Duplicate data not allowed.` });
    } else {
      if (update.givenName && update.familyName) {
        update.fullName = update.givenName + ' ' + update.familyName;
      } else if(update.givenName) {
        update.fullName = update.givenName + ' ' + user.familyName;
      } else if (update.familyName) {
        update.fullName = user.givenName + ' ' + update.familyName;
      }
      await dbModule.updateOneUser(userId, update);

      const edit = {
        timestamp: new Date(),
        op: 'update',
        col: 'users',
        target: { userId },
        update,
        auth: req.auth,
      };
      await dbModule.saveEdit(edit);

      res.status(200).json({ message: `User ${userId} updated, ${userId}` });
    }

  } catch (err) {
    next(err);
  }
});
// get one user by ID
router.get('/:userId', validId('userId'), async (req, res, next) => {
  try {
    if (!req.auth) {
      return res.status(401).json({ error: 'You must be logged in!' });
    }
    const userId = req.userId;
    const user = await dbModule.findUserById(userId);
    if (!user) {
      res.status(404).json({ error: `User ${userId} not found.` });
    } else {
      res.status(200).json(user);
    }
  } catch (err) {
    next(err);
  }
});
// Register
router.post('/register', validBody(newUserSchema), async (req, res, next) => {
  try {
    const user = { ...req.body, _id: newId(), createdOn: new Date(), role: null };

    const userId = user._id;

    // hash password
    user.password = await bcrypt.hash(user.password, 10);
    
    const foundUser = await dbModule.findUserByEmail(user.emailAddress);
    if (foundUser != undefined) {
      res.status(400).json({ error: 'Email already registered' });
    } else {
      const dbResult = await dbModule.insertOneUser(user);
      debug('register result:', dbResult);

      const authToken = await issueAuthToken(user);

      setAuthCookie(res, authToken);

      const edit = {
        timestamp: new Date(),
        op: 'insert',
        col: 'users',
        target: { userId },
        update: user,
        auth: req.auth,
      };
      await dbModule.saveEdit(edit);

      res.status(200).json({ message: 'New user registered!', userId: user._id, token: authToken });
    }
  } catch (err) {
    next(err);
  }
});
// Login
router.post('/login', validBody(loginUserSchema), async (req, res, next) => {
  try {
    const loginCreds = req.body;
    const user = await dbModule.findUserByEmail(loginCreds.emailAddress);
    if (user && (await bcrypt.compare(loginCreds.password, user.password))) {
      
      const authToken = await issueAuthToken(user);

      setAuthCookie(res, authToken);

      res.status(200).json({ message: 'Welcome back!', userId: user._id, token: authToken });
    } else {
      res.status(400).json({ error: 'Invalid credentials provided. Please try again.' });
    }
  } catch (err) {
    next(err);
  }
});
// Update
router.put('/:userId', validId('userId'), validBody(updateUserSchema), async (req, res, next) => {
  try {
    if (!req.auth) {
      return res.status(401).json({ error: 'You must be logged in!' });
    }
    const userId = req.userId;
    const update = req.body;
    console.log(update);

    if (update) {
      update.lastUpdatedOn = new Date();
      update.lastUpdatedBy = newId(req.auth._id);
    }

    if (update.password) {
      const saltRounds = parseInt(config.get('auth.saltRounds'));
      update.password = await bcrypt.hash(update.password, saltRounds);
    }

    const user = await dbModule.findUserById(userId);
    if (!user) {
      res.status(404).json({ error: `User ${userId} not found.` });
    } else if (
      update.emailAddress === user.emailAddress ||
      update.password === user.password ||
      update.givenName === user.givenName ||
      update.familyName === user.familyName ||
      update.role === user.role
    ) {
      res.status(400).json({ error: `Duplicate data not allowed.` });
    } else {
      if (update.givenName && update.familyName) {
        update.fullName = update.givenName + ' ' + update.familyName;
      } else if(update.givenName) {
        update.fullName = update.givenName + ' ' + user.familyName;
      } else if (update.familyName) {
        update.fullName = user.givenName + ' ' + update.familyName;
      }
      await dbModule.updateOneUser(userId, update);

      const edit = {
        timestamp: new Date(),
        op: 'update',
        col: 'users',
        target: { userId },
        update,
        auth: req.auth,
      };
      await dbModule.saveEdit(edit);

      res.status(200).json({ message: `User ${userId} updated, ${userId}` });
    }
  } catch (err) {
    next(err);
  }
});
// Delete
router.delete('/:userId', validId('userId'), async (req, res, next) => {
  try {
    if (!req.auth) {
      return res.status(401).json({ error: 'You must be logged in!' });
    }

    const userId = req.userId;
    const user = await dbModule.findUserById(userId);
    if (!user) {
      res.status(404).json({ error: `User ${userId} not found` });
    } else {
      await dbModule.deleteOneUser(userId);

      const edit = {
        timestamp: new Date(),
        op: 'delete',
        col: 'users',
        target: { userId },
        auth: req.auth,
      };
      await dbModule.saveEdit(edit);

      res.json({ message: `User ${userId} deleted.` });
    }
  } catch (err) {
    next(err);
  }
  
});

export { router as userRouter };
