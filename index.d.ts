type TChallengesRunner = () => Promise<string>;
declare const runChallenge: TChallengesRunner;
type TInitChallengesOptions = {
    clientKey: string;
    api?: string;
    disableTelemetry?: boolean;
};
declare const initChallenges: ({ api, clientKey, disableTelemetry }: TInitChallengesOptions) => Promise<TChallengesRunner>;
declare const setUserId: (id: string) => void;
export { initChallenges, runChallenge, setUserId };
