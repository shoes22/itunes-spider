const express = require('express');
const http = require("http");
const dotenv = require('dotenv');
dotenv.config();
const logger = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
const scapers = require('../libs');
const router = require('./routes.js');

let port = 3000;
if( process.env.NODE_ENV === 'development') {
  port = 3001; //49160
}

const mongo = new scapers.mongo();
mongo.connect('podcasts');

const app = express();

app.use(logger('dev'));
app.set('mongo', mongo);
app.use(express.static(path.join(__dirname, 'views')));
app.use(bodyParser.json({limit: '500mb'}));
app.use(bodyParser.urlencoded({ extended: true, limit: '500mb' }));

app.use(router);

app.listen(port, () => {
  console.log(`App version 1.1 listening on port ${port}!`);
})
