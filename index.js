const packageName = "[ВоtВуе] ";
let INIT_TIMESTAMP = null;
let LOAD_FAILED = false;
let DISPOSE = null;
const TIMEOUTS = {
  loading: 10000,
  init: 5000,
  runtime: 5000
};
const RETRY_ATTEMPTS = {
  loading: 2
};
function generateId(length) {
  const loverCases = new Array(26).fill(null).map((_, i) => String.fromCharCode(97 + i));
  const upperCases = new Array(26).fill(null).map((_, i) => String.fromCharCode(65 + i));
  const numbers = new Array(10).fill(null).map((_, i) => String(i));
  const concatted = loverCases.concat(upperCases, numbers);
  const arrLength = concatted.length;
  return new Array(length).fill(null).map(() => concatted[Math.floor(Math.random() * arrLength)]).join("");
}
let userId = "";
let sessionId = "";
function generateUserId() {
  if (userId) {
    return userId;
  }
  try {
    const saved = localStorage.getItem("__botbye_uid");
    if (saved) {
      userId = saved;
      return userId;
    }
    userId = generateId(10);
    localStorage.setItem("__botbye_uid", userId);
    return userId;
  } catch (e) {
    return generateId(10);
  }
}
function generateSessionId() {
  if (sessionId) {
    return sessionId;
  }
  try {
    const saved = sessionStorage.getItem("__botbye_sid");
    if (saved) {
      sessionId = saved;
      return sessionId;
    }
    sessionId = generateId(8);
    sessionStorage.setItem("__botbye_sid", userId);
    return sessionId;
  } catch (e) {
    return generateId(8);
  }
}
let vmId = generateId(8);
const tokenBuilder = payload => `visitorId=${generateUserId()}&sessionId=${generateSessionId()}&token=${encodeURIComponent(payload)}`;
const createError = (message, e) => {
  if (e instanceof Error) {
    return new Error(`${message} ${e.message}`);
  }
  return new Error(message);
};
const awaitWithTimeout = async (promise, ms, timeoutMessage) => {
  let timer = null;
  const timeout = new Promise(resolve => {
    timer = setTimeout(() => {
      resolve(null);
    }, ms);
  });
  const result = await Promise.race([promise, timeout]);
  if (timer) {
    clearTimeout(timer);
  }
  if (!result) {
    throw new Error(timeoutMessage);
  }
  return result;
};
const withRetryAndTimeout = async (promiseFactory, attempts, ms, timeoutMessage) => {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const result = await awaitWithTimeout(promiseFactory(), ms, timeoutMessage);
      return result;
    } catch (e) {}
  }
  throw new Error(timeoutMessage + ` (${attempts} attempts)`);
};
const loadRunnerCode = async (url, siteKey) => {
  try {
    const promiseFactory = () => fetch(`${url}/challenges/v1/${siteKey}/${vmId}`).then(async r => {
      if (!r.ok) {
        const message = await r.text();
        throw createError(message);
      }
      const code = await r.text();
      const timestamp = r.headers.get("X-Server-Timestamp");
      return {
        code,
        timestamp
      };
    });
    return await withRetryAndTimeout(promiseFactory, RETRY_ATTEMPTS.loading, TIMEOUTS.loading, "loading.timeout");
  } catch (e) {
    throw createError("error.runner.loading", e);
  }
};
const parseRunnerCode = runnerCode => {
  try {
    return new Function("tsmp", "api", runnerCode);
  } catch (e) {
    throw createError("error.runner.parse", e);
  }
};
const initRunner = async (runnerConstructor, timestamp, api) => {
  let runner;
  try {
    runner = await awaitWithTimeout(runnerConstructor(timestamp, api), TIMEOUTS.init, "init.timeout");
    runner.t = () => vmId;
    DISPOSE = runner.d;
    return runner;
  } catch (e) {
    throw createError("error.runner.init", e);
  }
};
const main = async options => {
  const {
    api,
    siteKey
  } = options;
  let runner;
  try {
    const {
      code,
      timestamp
    } = await loadRunnerCode(api, siteKey);
    const normalizedTimestamp = timestamp ? Number.parseFloat(timestamp) * 1000 : Date.now();
    const runnerConstructor = parseRunnerCode(code);
    runner = await initRunner(runnerConstructor, normalizedTimestamp, api);
  } catch (e) {
    if (e instanceof Error) {
      LOAD_FAILED = true;
      const {
        message
      } = e;
      return () => Promise.resolve(tokenBuilder(packageName + `error.init ${message}`));
    }
    return () => Promise.resolve(tokenBuilder(packageName + "error.init.unknown"));
  }
  return async () => {
    try {
      return await awaitWithTimeout(runner.t, TIMEOUTS.runtime, "runtime.timeout");
    } catch (e) {
      const {
        message
      } = createError("error.runner.runtime", e);
      return tokenBuilder(packageName + message);
    }
  };
};
let initPromise = null;
const initChallengesMain = async options => {
  if (initPromise) {
    throw createError(packageName + "Init script already called");
  }
  INIT_TIMESTAMP = Date.now();
  LOAD_FAILED = false;
  initPromise = new Promise(resolve => {
    main(options).then(runner => {
      reloadLoop(options);
      resolve(runner);
    }).catch(e => {
      const {
        message
      } = createError("error.main", e);
      reloadLoop(options);
      resolve(() => Promise.resolve(tokenBuilder(packageName + message)));
    });
  });
  await initPromise;
  return runChallenge;
};
const reloadLoop = options => {
  setTimeout(() => {
    const now = Date.now();
    const elapsed = now - (INIT_TIMESTAMP ?? 0);
    if (LOAD_FAILED || elapsed < 0 || elapsed > 5 * 60 * 1000) {
      dispose();
      vmId = generateId(8);
      void initChallengesMain(options);
    } else {
      reloadLoop(options);
    }
  }, 10000);
};
const runChallenge = async () => {
  if (!initPromise) {
    throw createError(packageName + "Init script should be called first");
  }
  const runner = await initPromise;
  return runner();
};
const dispose = () => {
  if (DISPOSE) {
    DISPOSE().catch(() => void 0);
    DISPOSE = null;
  }
  initPromise = null;
};
const initTelemetry = async ({
  api,
  siteKey
}) => {
  try {
    const promiseFactory = () => fetch(`${api}/analytics/v1/${siteKey}`).then(async r => {
      if (!r.ok) {
        const message = await r.text();
        throw createError(message);
      }
      return r.text();
    });
    const code = await withRetryAndTimeout(promiseFactory, RETRY_ATTEMPTS.loading, TIMEOUTS.loading, "telemetry.loading.timeout");
    new Function("sk", "api", code)(siteKey, api);
  } catch {}
};
const initChallenges = ({
  api = "https://api.botbye.com",
  siteKey,
  disableTelemetry = false
}) => {
  const options = {
    api,
    siteKey
  };
  if (!disableTelemetry) {
    initTelemetry(options).catch(() => void 0);
  }
  return initChallengesMain(options);
};
export { initChallenges, runChallenge };