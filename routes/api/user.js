import debug from 'debug';
const debugMain = debug('app:route:user');
import express from 'express';
import moment from 'moment';
import _ from 'lodash';
import { nanoid } from 'nanoid';

// fix me: use this array to store user data in for now
// we will replace this with a database in a later assignment
const usersArray = [
  {
    _id: "eKWJIlArL1mbWw7LwwFjg",
    email: 'jmandelmvp@gmail.com',
    password: '123456',
    givenName: 'Joshua',
    familyName: 'Mandel',
    fullName: 'Joshua Mandel',
    role: 'Developer',
  },
  {
    _id: "2DTOwDYRO1Hrl-DxtKgi8",
    email: 'vbottini@gmail.com',
    password: '54321',
    givenName: 'Vincent',
    familyName: 'Bottini',
    fullName: 'Vincent Bottini',
    role: 'Business Analyst',
  },
  {
    _id: "iC62zc87TiRsb3eEblXTS",
    email: 'atopovic@gmail.com',
    password: '55555',
    givenName: 'Amel',
    familyName: 'Topovic',
    fullName: 'Amel Topovic',
    role: 'Developer',
  },
];

// create router
const router = express.Router();

//register routes
router.get('/list', (req, res, next) => {
  res.json(usersArray);
});
router.get('/:userId', (req, res, next) => {
  const userId = req.params.userId;
  const user = usersArray.find(x => x._id == userId);
  if(!user) {
    res.status(404).json({ error: "User not found" });
  } else{
    res.json(user);
  }
  // FIXME: get user from usersArray and send response as json
});
router.post('/register', (req, res, next) => {
  const userId = "4AMEPNdO64fHTiL2fCQOi";
  const { email, password, givenName, familyName, role} = req.body;
  const fullName = givenName + ' ' + familyName;
  const newUser = {
    _id: userId,
    email,
    password,
    givenName,
    familyName,
    fullName,
    role,
    createdDate: new Date()
  }
  if(!email) {
    res.status(400).json({ error: "Email required!" });
  } else if (!password) {
    res.status(400).json({ error: 'Password required!' });
  } else if (!givenName) {
    res.status(400).json({ error: "First Name required!" });
  }else if (!familyName) {
    res.status(400).json({ error: "Last Name required!" });
  }else if (!role) {
    res.status(400).json({ error: "Role required!" });
  }else {
    usersArray.push(newUser);
    res.json(newUser);
  }
  //FIXME: register new user and send response as a json
});
router.post('/login', (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let foundUser = false;

  for (let index = 0; index < usersArray.length; index++) {
    if(usersArray[index].email == email && usersArray[index].password == password) {
      res.json(usersArray[index]);
      foundUser = true;
    }
  }
  if(!foundUser)
  {
    res.status(404).json({ error: 'Please enter a valid username and password' });
  }
  //FIXME: check user's email and password and send response as json
});
router.put('/:userId', (req, res, next) => {
  const userId = req.params.userId;
  const { email, password, givenName, familyName, role} = req.body;
  const user = usersArray.find(x => x._id == userId);

  if(!user) {
    res.status(404).json({error: 'User Not Found!'});
  }else {
    if (email !=undefined) {
      user.email = email;
    }
    if (password !=undefined) {
      user.password = password;
    }
    if (givenName !=undefined) {
      user.givenName = givenName;
    }
    if (familyName !=undefined) {
      user.familyName = familyName;
    }
    if (role !=undefined) {
      user.role = role;
    }
    user.fullName = user.givenName + ' ' + user.familyName;
    user.updatedDate = new Date();

    res.json(user);
  }
  //FIXME: update existing user and send response as json
});
router.delete('/:userId', (req, res, next) => {
  const userId = req.params.userId;
  const index = usersArray.findIndex((user) => user._id == userId);
  if(index < 0) {
    res.status(404).json({ error: "User not found!"});
  }else{
    usersArray.splice(index, 1);
    res.json({ message: "User deleted" });
  }
  //FIXME: delete user and send response as json
});

export { router as userRouter };
