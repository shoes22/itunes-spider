const controllers = require('./controllers');
const router = require('express').Router();

router.get('/', (req, res) => {
  res.send('hello world....');
});

router.get('/v1/notify-sub', controllers.websub);
router.post('/v1/notify-sub', controllers.websub);
router.get('/v1/submit-url', controllers.home);
router.post('/v1/add-rss', controllers.chartable.addRSS);

//router.put('/v1/top_itunes_100', controllers.iTunes.put);
router.get('/v1/test', controllers.chartable.testUrl);

router.get('/v1/chartable', controllers.chartable.get);

router.get('/v1/chartable_trend', controllers.chartable.getTrending);

router.get('/v1/chartable_apple', controllers.chartable.getApple);

router.get('/v1/update_top', controllers.chartable.updateTop);

router.get('/v1/update_trending', controllers.chartable.updateTrending);

router.get('/v1/update_top2', controllers.chartable.updateTopLeftovers);

router.get('/v1/update_trending2', controllers.chartable.updateTrendingLeftovers);

router.get('/v1/update_apple', controllers.chartable.updateApple);

router.get('/v1/update_apple2', controllers.chartable.updateAppleLeftovers);

router.get('/v1/fix_links', controllers.chartable.fixLink);

module.exports = router;
