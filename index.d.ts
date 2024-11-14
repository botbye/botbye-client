type TChallengesRunner = () => Promise<string>;
type TInitChallengesOptions = {
    clientKey: string;
    api?: string;
    disableTelemetry?: boolean;
};
declare const setUserId: (userId: string) => void, initChallenges: ({ api, clientKey, disableTelemetry, }: TInitChallengesOptions) => Promise<TChallengesRunner>, runChallenge: TChallengesRunner;
export { initChallenges, runChallenge, setUserId, };
