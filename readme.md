[BotBye](https://botbye.com)  
[DOCS](https://botbye.com/docs)

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

#### 2. Call `initChallenges` with your project `client-key` (available inside your [Projects](https://app.botbye.com/admin/projects)):

```javascript
/**
 * @param {Object} options - The options for BotBye init
 * @return {Promise} - Promise with runChallenge function
 */
const runChallenge = await initChallenges({
            clientKey: '00000000-0000-0000-0000-000000000000' // Use your client-key
        });
```

#### 3. To run challenge and generate BotBye token call `runChallenge`:

```javascript
/**
 * @return {Promise} Promise with BotBye token
 */
const botByeToken = await runChallenge();
```

#### 4. Send this token in any convenient way to the backend. For example in `BotBye-Token` header:

```javascript
fetch('https://domain.com', {
  method: "POST",
  headers: {
    "BotBye-Token": botByeToken
  }
})
```

### runChallenge()

Package also exports `runChallenge` function.
Before call it, make sure that `initChallenges` was called earlier.

```javascript
import {initChallenges, runChallenge} from "botbye-client";

initChallenges({
    clientKey: '00000000-0000-0000-0000-000000000000' // Use your client-key
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