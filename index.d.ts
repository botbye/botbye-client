type TChallengesRunner = () => Promise<string>;
declare const initChallenges: (siteKey: string) => Promise<TChallengesRunner>;
declare const runChallenge: TChallengesRunner;
export { initChallenges, runChallenge };
