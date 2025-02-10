const packageName = "[ВоtВуе NPM] ";
const TIMEOUTS = {
  loading: 10000,
  init: 10000,
  runtime: 10000
};
const RETRY_ATTEMPTS = {
  loading: 2
};
const voidFn = () => void 0;
function defer() {
  let resolve = voidFn;
  let reject = voidFn;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return {
    promise,
    resolve,
    reject
  };
}
function generateId(length) {
  const loverCases = new Array(26).fill(null).map((_, i) => String.fromCharCode(97 + i));
  const upperCases = new Array(26).fill(null).map((_, i) => String.fromCharCode(65 + i));
  const numbers = new Array(10).fill(null).map((_, i) => String(i));
  const concatted = loverCases.concat(upperCases, numbers);
  const arrLength = concatted.length;
  return new Array(length).fill(null).map(() => concatted[Math.floor(Math.random() * arrLength)]).join("");
}
function generateUserId() {
  try {
    let userId = localStorage.getItem("__botbye_uid");
    if (userId) {
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
  try {
    let sessionId = sessionStorage.getItem("__botbye_sid");
    if (sessionId) {
      return sessionId;
    }
    sessionId = generateId(8);
    sessionStorage.setItem("__botbye_sid", sessionId);
    return sessionId;
  } catch (e) {
    return generateId(8);
  }
}
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
      setTimeout(() => {
        resolve(null);
      }, 100);
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
const any = function (promises) {
  return new Promise(function (resolve, reject) {
    let counter = 0;
    promises.forEach(promise => {
      promise.then(resolve).catch(function (e) {
        if (++counter === promises.length) {
          reject(e);
        }
      });
    });
  });
};
const withRetryAndTimeout = async (promiseFactory, attempts, ms, timeoutMessage) => {
  const requests = [];
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      requests.push(promiseFactory());
      const result = await awaitWithTimeout(any(requests), ms, timeoutMessage);
      return result;
    } catch (e) {
      if (attempt === attempts - 1) {
        throw e;
      }
    }
  }
  throw new Error(timeoutMessage + ` (${attempts} attempts)`);
};
async function initRemoteStorage(api, clientKey, storage, cb) {
  try {
    const promiseFactory = () => fetch(`${api}/vstrg/v1/${clientKey}`);
    const code = await withRetryAndTimeout(promiseFactory, RETRY_ATTEMPTS.loading, TIMEOUTS.loading, "loading.timeout").then(async r => {
      if (!r.ok) {
        const message = await r.text();
        throw createError(message);
      }
      return r.text();
    });
    const {
      promise,
      resolve
    } = defer();
    new Function("api", "res", code)(api, resolve);
    promise.then(result => {
      if (typeof result === "object" && result != null && "get" in result && "set" in result && "fill" in result) {
        storage.set = result.set;
        storage.get = result.get;
        result.fill(storage.storage);
        cb(0);
      }
    }).catch(voidFn);
  } catch {}
}
async function initTelemetry(api, clientKey) {
  try {
    const promiseFactory = () => fetch(`${api}/analytics/v1/${clientKey}`);
    const code = await withRetryAndTimeout(promiseFactory, RETRY_ATTEMPTS.loading, TIMEOUTS.loading, "loading.timeout").then(async r => {
      if (!r.ok) {
        const message = await r.text();
        throw createError(message);
      }
      return r.text();
    });
    new Function("sk", "api", code)(clientKey, api);
  } catch {}
}
async function loadRunnerCode(api, clientKey) {
  try {
    const promiseFactory = () => fetch(`${api}/challenges/v1/${clientKey}`);
    return withRetryAndTimeout(promiseFactory, RETRY_ATTEMPTS.loading, TIMEOUTS.loading, "loading.timeout").then(async r => {
      if (!r.ok) {
        const message = await r.text();
        throw createError(message);
      }
      return r.text();
    });
  } catch (e) {
    throw createError("error.runner.loading", e);
  }
}
async function getTime(url) {
  const random = Math.floor(Math.random() * 1000000);
  try {
    const promiseFactory = () => fetch(`${url}/time/v1/${random}`, {
      method: "POST"
    });
    return await withRetryAndTimeout(promiseFactory, RETRY_ATTEMPTS.loading, TIMEOUTS.loading, "time.loading.timeout").then(async r => {
      if (!r.ok) {
        const message = await r.text();
        throw createError(message);
      }
      return r.json();
    });
  } catch (e) {
    throw createError("error.time.loading", e);
  }
}
function parseRunnerCode(runnerCode) {
  try {
    return new Function("tsmp", "api", "ss", runnerCode);
  } catch (e) {
    throw createError("error.runner.parse", e);
  }
}
const factory = () => {
  let runnerPromise = null;
  let INIT_TIMESTAMP = null;
  let ERROR = false;
  let RELOAD_TIME = 5000;
  let DISPOSE = null;
  let SET_USER_ID = null;
  const storageDefer = defer();
  const storage = {
    storage: {},
    get: function (key) {
      return this.storage[key];
    },
    set: function (key, value) {
      this.storage[key] = value;
    },
    i: storageDefer.promise
  };
  const SS = {
    storage
  };
  const userId = generateUserId();
  const sessionId = generateSessionId();
  let vmId = generateId(8);
  const tokenBuilder = payload => `visitorId=${userId}&sessionId=${sessionId}&token=${encodeURIComponent(payload)}`;
  const dispose = () => {
    if (DISPOSE) {
      DISPOSE().catch(voidFn);
      DISPOSE = null;
    }
    runnerPromise = null;
  };
  const initRunner = async (runnerConstructor, timestamp, api) => {
    let runner;
    try {
      runner = await awaitWithTimeout(runnerConstructor(timestamp, api, SS), TIMEOUTS.init, "init.timeout");
      runner.t = () => vmId;
      DISPOSE = runner.d;
      SET_USER_ID = runner.sui;
      return runner;
    } catch (e) {
      throw createError("error.runner.init", e);
    }
  };
  const getRunner = async (api, clientKey) => {
    let runner;
    const logs = [Date.now(), 0, 0, 0];
    SS.logs = logs;
    try {
      const timestampPromise = getTime(api);
      timestampPromise.catch(voidFn);
      const code = await loadRunnerCode(api, clientKey);
      logs[1] = Date.now() - logs[0];
      const timestamp = (await timestampPromise).time;
      const runnerConstructor = parseRunnerCode(code);
      logs[2] = Date.now() - logs[0];
      runner = await initRunner(runnerConstructor, timestamp, api);
      logs[3] = Date.now() - logs[0];
    } catch (e) {
      const end = Date.now() - logs[0];
      const logStr = ` [${logs.join(":")}:${end}]`;
      ERROR = true;
      if (e instanceof Error) {
        const {
          message
        } = e;
        return () => Promise.resolve(tokenBuilder(packageName + "error.init " + message + logStr));
      }
      return () => Promise.resolve(tokenBuilder(packageName + "error.init.unknown " + logStr));
    }
    return async () => {
      const start = Date.now();
      try {
        return await awaitWithTimeout(runner.t, TIMEOUTS.runtime, "runtime.timeout");
      } catch (e) {
        ERROR = true;
        const end = Date.now() - start;
        const logStr = ` [${logs.join(":")}:${start}:${end}]`;
        const {
          message
        } = createError("error.runner.runtime", e);
        return tokenBuilder(packageName + message + logStr);
      }
    };
  };
  const reloadLoop = (api, clientKey) => {
    setTimeout(() => {
      const now = Date.now();
      const elapsed = now - (INIT_TIMESTAMP ?? 0);
      if (ERROR || elapsed < 0 || elapsed > 5 * 60 * 1000) {
        if (ERROR) {
          RELOAD_TIME = Math.min(RELOAD_TIME + 5000, 60000);
        } else {
          RELOAD_TIME = 5000;
        }
        dispose();
        vmId = generateId(8);
        void main(api, clientKey);
      } else {
        reloadLoop(api, clientKey);
      }
    }, RELOAD_TIME);
  };
  const main = async (api, clientKey) => {
    if (runnerPromise) {
      throw createError(packageName + "Init script already called");
    }
    INIT_TIMESTAMP = Date.now();
    ERROR = false;
    runnerPromise = new Promise(resolve => {
      getRunner(api, clientKey).then(runner => {
        reloadLoop(api, clientKey);
        resolve(runner);
      }).catch(e => {
        const {
          message
        } = createError("error.main", e);
        reloadLoop(api, clientKey);
        resolve(() => Promise.resolve(tokenBuilder(packageName + message)));
      });
    });
    await runnerPromise;
    return runChallenge;
  };
  const initChallenges = ({
                            api = "https://verify.botbye.com",
                            clientKey,
                            disableTelemetry = false
                          }) => {
    initRemoteStorage(api, clientKey, storage, storageDefer.resolve).catch(voidFn);
    if (!disableTelemetry) {
      initTelemetry(api, clientKey).catch(voidFn);
    }
    return main(api, clientKey);
  };
  const setUserId = userId => {
    storageDefer.promise.then(() => {
      SET_USER_ID && SET_USER_ID(userId).catch(voidFn);
    }).catch(voidFn);
  };
  const runChallenge = async () => {
    if (!runnerPromise) {
      throw createError(packageName + "Init script should be called first");
    }
    const runner = await runnerPromise;
    return runner();
  };
  return {
    setUserId,
    initChallenges,
    runChallenge
  };
};
const {
  setUserId,
  initChallenges,
  runChallenge
} = factory();
export { initChallenges, runChallenge, setUserId };