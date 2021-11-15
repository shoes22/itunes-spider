'use strict';
const models = require('../models');
const scapers = require('../../libs');

const put = (req, res) => {
  // top 100
  res.send({message: 'done...'})
}

const updateTopLeftovers = async (req, res) => {
  const results = await models.chartable.findAll(1, true);
  const updated = await models.chartable.update(results, 1, true);
  res.send({message: 'done...'});
}

const fixLink = async (req, res) => {
  const results = await models.chartable.findAll(3, false);
  const updated = await models.chartable.fixBadLink(results);
  res.send({message: 'done...'});
}

const updateTop = async (req, res) => {
  const results = await models.chartable.findAll(1, false);
  const updated = await models.chartable.update(results, 1, false);
  res.send({message: 'done...'});
}

const updateTrending = async (req, res) => {
  const results = await models.chartable.findAll(2, false);
  const updated = await models.chartable.update(results, 2, false);
  res.send({message: 'done...'});
}

const updateTrendingLeftovers = async (req, res) => {
  const results = await models.chartable.findAll(2, true);
  const updated = await models.chartable.update(results, 2, true);
  res.send({message: 'done...'});
}

const updateApple = async (req, res) => {
  const results = await models.chartable.findAll(3, false);
  const updated = await models.chartable.update(results, 3, false);
  res.send({message: 'done...'});
}

const updateAppleLeftovers = async (req, res) => {
  const results = await models.chartable.findAll(3, true);
  const updated = await models.chartable.update(results, 3, true);
  res.send({message: 'done...'});
}

const get = (req, res) => {
  // find all
  models.chartable.parseAll(true)
  res.send({message: 'done...'})
}

const getTrending = (req, res) => {
  // find all
  models.chartable.parseAll(false)
  res.send({message: 'done...'})
}

const getApple = (req, res) => {
  models.chartable.parseApple();
  res.send({message: 'done...'})
}

const testUrl = (req, res) => {
  models.chartable.testUrl('https://chartable.com/podcasts/49');
  res.send({message: 'done...'})
}

const addRSS = async (req, res) => {
  const result = await models.chartable.submitURL(req.body.url, req.body.itunesId);
  res.send(result);
  //models.chartable.addRSS()
}

module.exports = {
  get,
  getTrending,
  getApple,
  testUrl,
  put,
  updateTop,
  updateTrending,
  updateApple,
  updateTopLeftovers,
  updateTrendingLeftovers,
  updateAppleLeftovers,
  fixLink,
  addRSS
}
