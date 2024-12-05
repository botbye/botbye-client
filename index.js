const packageName = "[ВоtВуе] ";
const TIMEOUTS = {
  loading: 4000,
  init: 5000,
  runtime: 5000
};
const RETRY_ATTEMPTS = {
  loading: 2
};
function defer() {
  let resolve = null;
  let reject = null;
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
async function initRemoteStorage(api, clientKey, storage) {
  try {
    const promiseFactory = () => fetch(`${api}/vstrg/v1/${clientKey}`).then(async r => {
      if (!r.ok) {
        const message = await r.text();
        throw createError(message);
      }
      return r.text();
    });
    const code = await withRetryAndTimeout(promiseFactory, RETRY_ATTEMPTS.loading, TIMEOUTS.loading, "loading.timeout");
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
      }
    }).catch(() => void 0);
  } catch {}
}
async function initTelemetry(api, clientKey) {
  try {
    const promiseFactory = () => fetch(`${api}/analytics/v1/${clientKey}`).then(async r => {
      if (!r.ok) {
        const message = await r.text();
        throw createError(message);
      }
      return r.text();
    });
    const code = await withRetryAndTimeout(promiseFactory, RETRY_ATTEMPTS.loading, TIMEOUTS.loading, "loading.timeout");
    new Function("sk", "api", code)(clientKey, api);
  } catch {}
}
async function loadRunnerCode(api, clientKey, vmId) {
  try {
    const promiseFactory = () => fetch(`${api}/challenges/v1/${clientKey}/${vmId}`).then(async r => {
      if (!r.ok) {
        const message = await r.text();
        throw createError(message);
      }
      return r.text();
    });
    return await withRetryAndTimeout(promiseFactory, RETRY_ATTEMPTS.loading, TIMEOUTS.loading, "loading.timeout");
  } catch (e) {
    throw createError("error.runner.loading", e);
  }
}
async function getTime(url) {
  const random = Math.floor(Math.random() * 1000000);
  try {
    const promiseFactory = () => fetch(`${url}/time/v1/${random}`, {
      method: "POST"
    }).then(async r => {
      if (!r.ok) {
        const message = await r.text();
        throw createError(message);
      }
      return r.json();
    });
    return await withRetryAndTimeout(promiseFactory, RETRY_ATTEMPTS.loading, TIMEOUTS.loading, "time.loading.timeout");
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
  let LOAD_FAILED = false;
  let RELOAD_TIME = 10000;
  let DISPOSE = null;
  let SET_USER_ID = null;
  const storage = {
    storage: {},
    get: function (key) {
      return this.storage[key];
    },
    set: function (key, value) {
      this.storage[key] = value;
    }
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
      DISPOSE().catch(() => void 0);
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
    try {
      const timestampPromise = getTime(api);
      timestampPromise.catch(() => void 0);
      const code = await loadRunnerCode(api, clientKey, vmId);
      const timestamp = (await timestampPromise).time;
      const runnerConstructor = parseRunnerCode(code);
      runner = await initRunner(runnerConstructor, timestamp, api);
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
  const reloadLoop = (api, clientKey) => {
    setTimeout(() => {
      const now = Date.now();
      const elapsed = now - (INIT_TIMESTAMP ?? 0);
      if (LOAD_FAILED || elapsed < 0 || elapsed > 5 * 60 * 1000) {
        if (LOAD_FAILED) {
          RELOAD_TIME = Math.min(RELOAD_TIME + 10000, 60000);
        } else {
          RELOAD_TIME = 10000;
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
    LOAD_FAILED = false;
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
    initRemoteStorage(api, clientKey, storage).catch(() => void 0);
    if (!disableTelemetry) {
      initTelemetry(api, clientKey).catch(() => void 0);
    }
    return main(api, clientKey);
  };
  const setUserId = userId => {
    if (SET_USER_ID) {
      SET_USER_ID(userId).catch(() => void 0);
    }
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