# @botbye/client

[BotBye!](https://botbye.com) browser client library.

Full documentation: https://botbye.com/docs/client-side/npm-module

## Install

```bash
npm i @botbye/client
```

or

```bash
yarn add @botbye/client
```

## Configuration

Call `initChallenges` with your project `client-key`:

```javascript
import { initChallenges } from "@botbye/client";

const runChallenge = await initChallenges({
  // Use your client-key
  clientKey: "00000000-0000-0000-0000-000000000000"
});
```

## Usage

Generate token using `runChallenge` and send this token in any convenient way to the backend. For example in `x-botbye-token` header:

```javascript
import { runChallenge } from "@botbye/client";

const botByeToken = await runChallenge();

fetch(
  'https://domain.com',
  {
    method: "POST",
    headers: {
         // "x-botbye-token" is an example — send this token in any convenient way.
        "x-botbye-token": botByeToken
    }
  }
)
```

## Challenge runner

Package also exports `runChallenge` function. Before call it, make sure that `initChallenges` was called earlier.

```javascript
import { initChallenges, runChallenge } from "@botbye/client";

initChallenges({
  // Use your client-key
  clientKey: "00000000-0000-0000-0000-000000000000"
});

...

const botByeToken = await runChallenge()

fetch(
  'https://domain.com',
  {
      method: "POST",
      headers: {
          "x-botbye-token": botByeToken
      }
  }
)
```

## User identification

Call `setUserId` after a successful authentication to associate the current session with a user.
This helps BotBye detect multi-account abuse.

```javascript
import { setUserId } from "@botbye/client";

const response = await login({ username, password });

if (response.userId) {
  setUserId(response.userId);
}
```
