const controllers = require('./controllers');
const router = require('express').Router();

router.get('/', (req, res) => {
  res.send('hello world....');
});

router.put('/v1/top_itunes_100', controllers.iTunes.put);
router.post('/v1/itunes_all', controllers.iTunes.post);

module.exports = router;