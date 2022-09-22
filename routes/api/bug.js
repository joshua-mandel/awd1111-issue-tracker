import debug from 'debug';
const debugMain = debug('app:route:user');
import express from 'express';
import moment from 'moment';
import _ from 'lodash';
import { nanoid } from 'nanoid';

// FIXME: use this array to store bug data in for now
// we ll replace this with a database in a later assignment
const bugsArray = [
  {
    "_id": "631f82bfe9ee2c3ea33e102e",
    "title": "Add a Navbar",
    "description": "Add a robust and functioning navbar that matches the theme of the website.",
    "stepsToReproduce": "",
    "createdOn": new Date(),
    "closed": false,
    "bugClass": "unclassified",
    "authorId": {
      "$oid": "631ba80dfc5358d419c1962d"
    },
    "assignedToId": {
      "$oid": "631ba80dfc5358d419c1962d"
    },
    "timeSpent": [
      {
        "_id": {
          "$oid": "631ba80dfc5358d419c1962d"
        },
        "hours": 3,
        "submittedOn": "Mon Sep 12 2022 14:04:31 GMT-0500 (Central Daylight Time)"
      }
    ],
    "comments": [
      {
        "_id": "631ba80dfc5358d419c1962d",
        "commentText": "The navbar turned out great, I think the product owner is really going to like this!",
        "createdOn": "Mon Sep 12 2022 14:04:31 GMT-0500 (Central Daylight Time)"
      },
      {
        "_id": {
          "$oid": "631baa0bfc5358d419c19631"
        },
        "commentText": "Wow! Great job on the navbar Josh!, I think it turned out great!",
        "createdOn": "Mon Sep 12 2022 14:04:31 GMT-0500 (Central Daylight Time)"
      }
    ],
    "tests": [],
    "edit": [
      {
        "_id": {
          "$oid": "631ba80dfc5358d419c1962d"
        },
        "editDescription": "Added divs and nav tags to HTML code.",
        "createdOn": "Mon Sep 12 2022 14:04:31 GMT-0500 (Central Daylight Time)"
      },
      {
        "_id": {
          "$oid": "631ba80dfc5358d419c1962d"
        },
        "editDescription": "Added functionality to the navbar and everything should be working. READY FOR TEST."
      }
    ],
    "fixed": true,
    "approved": true
  },
  {
    "_id": "631f8af6e9ee2c3ea33e102f",
    "title": "Fix Contact Page Bug",
    "description": "Upon submitting a message on the contact page, there is an error that occurs and will not submit the message to the system.",
    "stepsToReproduce": "Try submitting a message on the contact page and check the console log for error codes.",
    "createdOn": new Date(),
    "closed": false,
    "bugClass": "bug",
    "authorId": {
      "$oid": "631ba8d9fc5358d419c1962e"
    },
    "assignedToId": {
      "$oid": "631ba99ffc5358d419c19630"
    },
    "timeSpent": [],
    "tests": [
      {
        "_id": {
          "$oid": "631ba99ffc5358d419c19630"
        },
        "passed": false,
        "createdOn": "Mon Sep 12 2022 14:39:34 GMT-0500 (Central Daylight Time)"
      }
    ],
    "edit": [
      {
        "_id": {
          "$oid": "631ba99ffc5358d419c19630"
        },
        "editDescription": "Tried changing the JavaScript but still will not work.",
        "createdOn": "Mon Sep 12 2022 14:39:34 GMT-0500 (Central Daylight Time)"
      },
      {
        "_id": {
          "$oid": "631ba99ffc5358d419c19630"
        },
        "editDescription": "Changed the id attribute since they didnt match up but the contact page still isnt working.",
        "createdOn": "Mon Sep 12 2022 14:39:34 GMT-0500 (Central Daylight Time)"
      }
    ],
    "fixed": true,
    "approved": false
  }
];

// create router
const router = express.Router();

// register routes
router.get('/list', (req, res, next) => {
  res.json(bugsArray);
});
router.get('/:bugId', (req, res, next) => {
  const bugId = req.params.bugId;
  const bug = bugsArray.find(x => x._id == bugId)
  if(!bug) {
    res.status(404).json({ error: "Bug not found" });
  } else{
    res.json(bug);
  }
  // FIXME: get bug from bugsArray and send response as json
});
router.put('/new', (req, res, next) => {
  const bugId = "4AMJHJHdO64fHTiL2fCQOi";
  const {title, description, stepsToReproduce} = req.body;
  const newBug = {
    _id: bugId,
    title,
    description,
    stepsToReproduce,
    createdOn: new Date()
  };
  if(!title) {
    res.status(400).json({ error: "Title Required!" });
  } else if(!description) {
    res.status(400).json({ error: "Description Required!" });
  }else if(!stepsToReproduce) {
    res.status(400).json({ error: "Steps to Reproduce Required!" });
  }else {
    bugsArray.push(newBug);
    res.json(newBug);
  }
  // FIXME: create new bug and send response as json
});
router.put('/:bugId', (req, res, next) => {
  const bugId = req.params.bugId;
  const { title, description, stepsToReproduce } = req.body;
  const bug = bugsArray.find(x => x._id == bugId);

  if(!bug) {
    res.status(404).json({error: 'Bug Not Found!'});
  }else {
    if (title !=undefined) {
      bug.title = title;
    }
    if (description !=undefined) {
      bug.description = description;
    }
    if (stepsToReproduce !=undefined) {
      bug.stepsToReproduce = stepsToReproduce;
    }
    bug.updatedDate = new Date();

    res.json(bug);
  }
  // FIXME: update existing bug and send response as json
});
router.put('/:bugId/classify', (req, res, next) => {
  const bugId = req.params.bugId;
  const { bugClass } = req.body;
  const bug = bugsArray.find(x => x._id == bugId);

  if(!bug) {
    res.status(404).json({error: 'Bug Not Found!'});
  }else {
    if(bugClass != undefined){
      bug.bugClass = bugClass;
    }
    bug.updatedDate = new Date();

    res.json(bug);
  }
  // FIXME: classify bug and send response as json
});
router.put('/:bugId/assign', (req, res, next) => {
  const bugId = req.params.bugId;
  const { userAssigned } = req.body;
  const bug = bugsArray.find(x => x._id == bugId);

  if(!bug) {
    res.status(404).json({error: 'Bug Not Found!'});
  }else {
    if(userAssigned != undefined){
      bug.userAssigned = userAssigned;
    }
    bug.updatedDate = new Date();

    res.json(bug);
  }
  // FIXME: assign bug to a user and send response as json
});
router.put('/:bugId/close', (req, res, next) => {
  const bugId = req.params.bugId;
  const { closed } = req.body;
  const bug = bugsArray.find(x => x._id == bugId);

  if(!bug) {
    res.status(404).json({error: 'Bug Not Found!'});
  }else {
    if(closed == "close"){
      bug.closed = true;
    }else if(closed == "open"){
      bug.closed = false
    }
    else{
      res.status(400).json({error: 'Please enter close or open!'});
    }
    bug.updatedDate = new Date();

    res.json(bug);
  }
  // FIXME: close bug and send response as json
});

export { router as bugRouter };
