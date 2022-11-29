
import * as dotenv from 'dotenv';
import config from 'config';
import express from 'express';
import debug from 'debug';
const debugMain = debug('app:server');
const debugError = debug('app:error');
import * as path from 'path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { bugRouter } from './routes/api/bug.js';
import { userRouter } from './routes/api/user.js';
import { commentRouter } from './routes/api/comment.js';
import { testRouter } from './routes/api/test.js';
import { auth } from './middleware/auth.js';
import { authMiddleware } from '@merlin4/express-auth';

dotenv.config();

// create application
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(auth());

// app.get('/', (req, res, next) => {
//   debugMain(`Home Page`);
//   res.type('text/plain').send('Home Page');
// });

// register routes
app.use('/api/user', userRouter);
app.use('/api/bug', bugRouter);
app.use('/api/bug', commentRouter);
app.use('/api/bug', testRouter);
app.use('/', express.static('public', { index: 'index.html' }));

// register error handlers
app.use((req, res, next) => {
  debugError(`Sorry couldn't find ${req.originalUrl}`);
  res.status(404).json({ error: `Sorry couldn't find ${req.originalUrl}` });
});
app.use((err, req, res, next) => {
  debugError(err);
  res.status(err.status || 500).json({ error: err.message });
});

// listen for requests
const hostname = config.get('http.host');
const port = config.get('http.port');
app.listen(port, () => {
  debugMain(`Server is running at http://${hostname}:${port}`);
});
