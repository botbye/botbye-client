type TGetTokenOptions = {};
type TChallengesRunner = (options?: TGetTokenOptions) => Promise<string>;
type TInitChallengesOptions = {
    api?: string;
    clientKey: string;
    withoutSessions?: boolean;
    withoutReload?: boolean;
    withoutRemoteStorage?: boolean;
};
declare const setUserId: (userId: string) => void, initChallenges: ({ api, clientKey, withoutSessions, }: TInitChallengesOptions) => Promise<TChallengesRunner>, runChallenge: TChallengesRunner;
export { initChallenges, runChallenge, setUserId, };
export type {TInitChallengesOptions, TGetTokenOptions}