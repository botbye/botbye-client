const VERSION = "1.0.12";
const packageName = `[ВоtВуе NPM ${VERSION}] `;
const TIMEOUTS = {
  loading: 10000,
  init: 10000,
  runtime: 10000
};
const RETRY_ATTEMPTS = {
  loading: 5
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
    const promiseFactory = () => loadScript(`${api}/vstrg/v2/${clientKey}`);
    const runner = await withRetryAndTimeout(promiseFactory, RETRY_ATTEMPTS.loading, TIMEOUTS.loading, "loading.timeout");
    const {
      promise,
      resolve
    } = defer();
    runner(api, resolve);
    promise.then(result => {
      if (typeof result === "object" && result != null && "get" in result && "set" in result && "fill" in result) {
        storage.set = result.set;
        storage.get = result.get;
        result.fill(storage.storage);
        cb();
      }
    }).catch(voidFn);
  } catch {}
}
async function initSessions(api, clientKey) {
  try {
    const promiseFactory = () => loadScript(`${api}/analytics/v2/${clientKey}`);
    const runner = await withRetryAndTimeout(promiseFactory, RETRY_ATTEMPTS.loading, TIMEOUTS.loading, "loading.timeout");
    runner(clientKey, api);
  } catch {}
}
const getId = () => String(Math.random()).replace("0.", "");
function loadScript(src) {
  const id = getId();
  const key = "__prt__" + id;
  window[key] = {};
  const script = document.createElement("script");
  script.src = src;
  script.dataset.id = id;
  script.async = true;
  document.body.append(script);
  const finalize = () => {
    script.remove();
    delete window[key];
  };
  return new Promise((resolve, reject) => {
    script.onload = () => {
      if (!window[key].r || typeof window[key].r !== "function") {
        reject(new Error("Not valid script loaded"));
        finalize();
        return;
      }
      resolve(window[key].r);
      finalize();
    };
    script.onerror = () => {
      finalize();
      reject(new Error("Script load error"));
    };
  });
}
function loadRunnerCode(api, clientKey) {
  const promiseFactory = () => loadScript(`${api}/challenges/v2/${clientKey}`);
  return withRetryAndTimeout(promiseFactory, RETRY_ATTEMPTS.loading, TIMEOUTS.loading, "loading.timeout").catch(e => {
    throw createError("error.runner.loading", e);
  });
}
async function getTime(api) {
  const random = Math.floor(Math.random() * 1000000);
  try {
    const promiseFactory = () => {
      const start = Date.now();
      return fetch(`${api}/time/v1/${random}`, {
        method: "POST"
      }).then(response => [response, start]);
    };
    const result = await withRetryAndTimeout(promiseFactory, RETRY_ATTEMPTS.loading, TIMEOUTS.loading, "time.loading.timeout");
    const [response, start] = result;
    if (!response.ok) {
      const message = await response.text();
      throw createError(message);
    }
    return response.json().then(({
                                   time
                                 }) => ({
      time,
      start
    }));
  } catch (e) {
    throw createError("error.time.loading", e);
  }
}
const factory = () => {
  let runnerPromise = null;
  let INIT_TIMESTAMP = null;
  let ERROR = false;
  let RELOAD_TIME = 2000;
  let DISPOSE = null;
  let SET_USER_ID = null;
  let successRunnerPromiseDefer = null;
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
  const tokenBuilder = payload => `visitorId=${userId}&sessionId=${sessionId}&token=${encodeURIComponent(payload)}`;
  const getRunner = async (api, clientKey) => {
    let runner;
    const logs = [Date.now(), 0, 0, 0, 0];
    try {
      const timeResult = getTime(api).then(r => {
        logs[1] = Date.now();
        return r;
      });
      timeResult.catch(() => void 0);
      const runnerConstructor = await loadRunnerCode(api, clientKey);
      logs[2] = Date.now();
      const serverTime = await timeResult;
      runner = await initRunner(runnerConstructor, serverTime.time, api, serverTime.time - serverTime.start);
      logs[3] = Date.now();
      return [runner, logs];
    } catch (e) {
      logs[4] = Date.now();
      const logStr = ` [${logs.join(":")}]`;
      if (e instanceof Error) {
        const {
          message
        } = e;
        throw createError("error.init " + message + logStr);
      }
      throw createError("error.init.unknown " + logStr);
    }
  };
  const initRunner = async (runnerConstructor, tsmp, api, dif) => {
    try {
      const runner = await awaitWithTimeout(runnerConstructor({
        tsmp,
        api,
        ss: SS,
        dif,
        v: "n." + VERSION
      }), TIMEOUTS.init, "init.timeout");
      const vmId = generateId(8);
      runner.t = () => vmId;
      return runner;
    } catch (e) {
      throw createError("error.runner.init", e);
    }
  };
  const dispose = () => {
    if (DISPOSE) {
      DISPOSE().catch(voidFn);
      DISPOSE = null;
    }
    runnerPromise = null;
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
        void main(api, clientKey);
      } else {
        reloadLoop(api, clientKey);
      }
    }, RELOAD_TIME);
  };
  const main = async (api, clientKey) => {
    INIT_TIMESTAMP = Date.now();
    ERROR = false;
    const newSuccessRunnerPromiseDefer = defer();
    successRunnerPromiseDefer && successRunnerPromiseDefer.resolve(newSuccessRunnerPromiseDefer.promise);
    successRunnerPromiseDefer = newSuccessRunnerPromiseDefer;
    const newRunnerPromise = new Promise(resolve => {
      getRunner(api, clientKey).then(([runner, logs]) => {
        reloadLoop(api, clientKey);
        const challengesRunner = async options => {
          try {
            return await awaitWithTimeout(runner.tv1(options), TIMEOUTS.runtime, "runtime.timeout");
          } catch (e) {
            const {
              message
            } = createError("error.runner.runtime", e);
            return tokenBuilder(packageName + message);
          }
        };
        resolve(challengesRunner);
        SS.logs = logs;
        dispose();
        DISPOSE = runner.d;
        SET_USER_ID = runner.sui;
        successRunnerPromiseDefer && successRunnerPromiseDefer.resolve(0);
      }).catch(e => {
        ERROR = true;
        const {
          message
        } = createError("error.main", e);
        reloadLoop(api, clientKey);
        resolve(() => Promise.resolve(tokenBuilder(packageName + message)));
      });
    });
    if (runnerPromise === null) {
      runnerPromise = newRunnerPromise;
    }
    await newRunnerPromise;
    if (!ERROR) {
      runnerPromise = newRunnerPromise;
    }
    return runChallenge;
  };
  const initChallenges = ({
                            api = "https://verify.botbye.com",
                            clientKey,
                            withoutSessions = false
                          }) => {
    successRunnerPromiseDefer = defer();
    initRemoteStorage(api, clientKey, storage, storageDefer.resolve).catch(voidFn);
    if (!withoutSessions) {
      initSessions(api, clientKey).catch(voidFn);
    }
    return main(api, clientKey);
  };
  const setUserId = userId => {
    const successRunnerPromise = successRunnerPromiseDefer && successRunnerPromiseDefer.promise;
    if (successRunnerPromise) {
      storageDefer.promise.then(() => successRunnerPromise).then(() => {
        SET_USER_ID && SET_USER_ID(userId).catch(voidFn);
      }).catch(voidFn);
    }
  };
  const runChallenge = async options => {
    if (!runnerPromise) {
      throw createError(packageName + "Init script should be called first");
    }
    const runner = await runnerPromise;
    return runner(options);
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
