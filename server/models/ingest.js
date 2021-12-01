const { fork } = require('promisify-child-process')

const runBashScript = async (scriptPath, scriptName, url) => {

    var pwd = scriptName == 'aggrivate' ? process.env.INGEST_PATH + '/aggrivate/' : process.env.INGEST_PATH + '/partytime/';

    var options = {cwd: pwd};

    var childProcess = fork(scriptPath, [url], options);

    const { code } = await childProcess;

    /*if (scriptName == 'aggrivate' && code == 100) {
      console.log("CODE IS 100!");
    } else if (scriptName == 'aggrivate') {
      console.log("CODE IS " + code);
    } else {
      console.log("Ran partytime?");
    }*/
    return code;
}

const checkSingleFeed = async (url) => {
  console.log("Running aggrivate for " + url);
  codeResult = await runBashScript('aggrivate', 'aggrivate', url);
  console.log('finished running aggrivate');
  if (!codeResult) {
    console.log("Running partytime for " + url);
    await runBashScript('partytime', 'partytime', url);
    console.log('finished running partytime');
  }
  return codeResult;
}

module.exports = {
  checkSingleFeed
}
