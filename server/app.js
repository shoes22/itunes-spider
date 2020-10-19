const express = require('express');
const http = require("http");
const dotenv = require('dotenv');
const logger = require('morgan');
const bodyParser = require('body-parser');
const router = require('./routes.js');

const app = express();
const server = http.createServer(app);
const port = 3001;

app.use(logger('dev'));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

app.use(router);

server.listen(port, () => {
  console.log(`App version 1.1 listening on port ${port}!`);
})
  