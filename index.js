const packageName = "BotBye";
const sessionID = Math.random().toString().replace("0.", "");

const url = 'https://api.botbye.com';
const loadRunnerCode = async siteKey =>
  fetch(`${url}/challenges/v1/${siteKey}`)
    .then(async r => {
      if (!r.ok) {
        const message = await r.text();
        throw new Error(`[${packageName}]: Can't load challenges. ${message}`);
      }
      const code = await r.text();
      const timestamp = r.headers.get("X-Server-Timestamp");
      return {
        code,
        timestamp
      };
    });
const parseRunnerCode = runnerCode => new Function("tsmp", runnerCode);
const initRunner = async (runnerConstructor, timestamp) => {
  const runner = await runnerConstructor(timestamp);
  runner.t = () => sessionID;
  return runner;
};
const main = async siteKey => {
  const {
    code,
    timestamp
  } = await loadRunnerCode(siteKey);
  const normalizedTimestamp = timestamp ? Number.parseFloat(timestamp) * 1000 : Date.now();
  const runnerConstructor = parseRunnerCode(code);
  const runner = await initRunner(runnerConstructor, normalizedTimestamp);
  return () => runner.t;
};
let initPromise = null;
const initChallenges = async siteKey => {
  if (initPromise) {
    console.warn(`[${packageName}]: Init script is called more than once`);
    return runChallenge;
  }
  initPromise = main(siteKey);
  await initPromise;
  return runChallenge;
};
const runChallenge = async () => {
  if (!initPromise) {
    throw new Error(`[${packageName}]: Init script should be called first`);
  }
  const runner = await initPromise;
  return runner();
};
export {initChallenges, runChallenge};
