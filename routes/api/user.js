import debug from 'debug';
const debugMain = debug('app:route:user');
import express from 'express';
import * as dbModule from '../../database.js';
import { newId } from '../../database.js';
import moment from 'moment';
import _ from 'lodash';
import { nanoid } from 'nanoid';
import { ObjectId } from 'mongodb';

// create router
const router = express.Router();

//register routes
// get all users
router.get('/list', async (req, res, next) => {
  try {
    const users = await dbModule.findAllUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
});
// get one user by ID
router.get('/:userId', async (req, res, next) => {
  try {
    const userId = newId(req.params.userId);
    const user = await dbModule.findUserById(userId);
    if (!user) {
      res.status(404).json({ error: `User ${userId} not found.` });
    } else {
      res.json(user);
    }
  } catch (err) {
    next(err);
  }
});
// Register
router.post('/register', async (req, res, next) => {
  try {
    const newUser = {
      _id: new ObjectId(),
      emailAddress: req.body.emailAddress,
      password: req.body.password,
      givenName: req.body.givenName,
      familyName: req.body.familyName,
      role: req.body.role,
    };

    const foundUser = await dbModule.findUserByEmail(newUser.emailAddress);
    if (!newUser.emailAddress) {
      res.status(400).json({ error: 'Email required!' });
    } else if (!newUser.password) {
      res.status(400).json({ error: 'Password required!' });
    } else if (!newUser.givenName) {
      res.status(400).json({ error: 'First Name required!' });
    } else if (!newUser.familyName) {
      res.status(400).json({ error: 'Last Name required!' });
    } else if (!newUser.role) {
      res.status(400).json({ error: 'Role required!' });
    } else if (foundUser != undefined) {
      res.status(400).json({ error: 'Email already registered' });
    } else {
      await dbModule.insertOneUser(newUser);
      res.status(200).json({ message: `New user registered!, ${newUser._id}` });
    }
  } catch (err) {
    next(err);
  }
});
// Login
router.post('/login', async (req, res, next) => {
  try {
    const loginCreds = {
      emailAddress: req.body.emailAddress,
      password: req.body.password
    }
    
    if(!loginCreds.emailAddress || !loginCreds.password) {
      res.status(400).json({ error: 'Please enter your login credentials' });
    } else {
      const userLoggedIn = await dbModule.login(loginCreds.emailAddress, loginCreds.password);
      if(!userLoggedIn) {
        res.status(400).json({ error: 'Invalid login credential provided. Please try again.' });
      } else {
        res.status(200).json({ message: `Welcome back!, ${userLoggedIn._id}`});
      }
    }
  } catch (err) {
    next(err);
  }
});
// Update
router.put('/:userId', (req, res, next) => {
  const userId = req.params.userId;
  const { email, password, givenName, familyName, role } = req.body;
  const user = usersArray.find((x) => x._id == userId);

  if (!user) {
    res.status(404).json({ error: 'User Not Found!' });
  } else {
    if (email != undefined) {
      user.email = email;
    }
    if (password != undefined) {
      user.password = password;
    }
    if (givenName != undefined) {
      user.givenName = givenName;
    }
    if (familyName != undefined) {
      user.familyName = familyName;
    }
    if (role != undefined) {
      user.role = role;
    }
    user.fullName = user.givenName + ' ' + user.familyName;
    user.updatedDate = new Date();

    res.status(200).json(user);
  }
  //FIXME: update existing user and send response as json
});
// Delete
router.delete('/:userId', (req, res, next) => {
  const userId = req.params.userId;
  const index = usersArray.findIndex((user) => user._id == userId);
  if (index < 0) {
    res.status(404).json({ error: 'User not found!' });
  } else {
    usersArray.splice(index, 1);
    res.json({ message: 'User deleted' });
  }
  //FIXME: delete user and send response as json
});

export { router as userRouter };
