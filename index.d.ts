type TChallengesRunner = () => Promise<string>;
declare const runChallenge: TChallengesRunner;
type TInitChallengesOptions = {
    clientKey: string;
    api?: string;
    disableTelemetry?: boolean;
};
declare const initChallenges: ({ api, clientKey, disableTelemetry }: TInitChallengesOptions) => Promise<TChallengesRunner>;
export { initChallenges, runChallenge, };
