type TChallengesRunner = () => Promise<string>;
declare const runChallenge: TChallengesRunner;
type TInitChallengesOptions = {
    siteKey: string;
    api?: string;
    disableTelemetry?: boolean;
};
declare const initChallenges: ({ api, siteKey, disableTelemetry }: TInitChallengesOptions) => Promise<TChallengesRunner>;
export { initChallenges, runChallenge, };
