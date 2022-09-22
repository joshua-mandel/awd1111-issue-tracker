import * as dotenv from 'dotenv';
dotenv.config();
import express from 'express';

import debug from 'debug';
const debugMain = debug('app:server');
const debugError = debug('app:error');
import * as path from 'path';
import cookieParser from 'cookie-parser';
import { bugRouter } from './routes/api/bug.js';
import { userRouter } from './routes/api/user.js';

// create application
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get('/', (req, res, next) => {
  debugMain(`Home Page`);
  res.type('text/plain').send('Home Page');
});

// register routes
app.use('/api/user', userRouter);
app.use('/api/bug', bugRouter);
// app.use('/', express.static('public', { index: 'index.html' }));

// register error handlers
app.use((req, res, next) => {
  debugError(`Sorry couldn't find ${req.originalUrl}`);
  res.status(404).json({ error: `Sorry couldn't find ${req.originalUrl}` });
});
app.use((err, req, res, next) => {
  debugError(err);
  res.status(err.status || 500).json({ error: error.message });
});

// listen for requests
const hostname = process.env.HOSTNAME || 'localhost';
const port = process.env.PORT || 5000;
app.listen(port, () => {
  debugMain(`Server is running at http://${hostname}:${port}`);
});
