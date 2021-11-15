'use strict';
const models = require('../models');

const put = (req, res) => {
  // top 100
  res.send({message: 'done...'})
}

const post = (req, res) => {
  // find all
  models.iTunes.parseAll()
  res.send({message: 'done...'})
}

module.exports = {
  post,
  put
}