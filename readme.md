[BotBye](https://botbye.com)  
[DOCS](https://docs.botbye.com)

## Install

```bash
npm i botbye-client
```

or

```bash
yarn add botbye-client
```

### Usage

#### 1. Import `initChallenges` from `botbye-client` module:

```javascript
import {initChallenges} from "botbye-client";
```

#### 2. Call `init` with SITE_KEY:

```javascript
/**
 * @param {Object} options - The options for BotBye init
 * @return {Promise} - Promise with runChallenge function
 */
const runChallenge = await initChallenges({
            siteKey: 'MY_SITE_KEY'
        });
```

#### 3. To run challenge and generate CHALLENGE_TOKEN call `runChallenge`

```javascript
/**
 * @return {Promise} Promise with BotBye token
 */
const botByeToken = await runChallenge();
```

#### 4. Send this token in any convenient way to the backend. For example in `Challenge-Token` header

```javascript
fetch('https://domain.com', {
  method: "POST",
  headers: {
    "BotBye-Token": botByeToken
  }
})
```

#### 5. runChallenge

Package also exports `runChallenge` function.
Before call it, make sure that `initChallenges` was called earlier.

```javascript
import {initChallenges, runChallenge} from "botbye-client";

initChallenges({
    siteKey: 'MY_SITE_KEY'
});

...

runChallenge()
  .then((botByeToken) =>
    fetch('https://domain.com', {
      method: "POST",
      headers: {
        "BotBye-Token": botByeToken
      }
    }))

```