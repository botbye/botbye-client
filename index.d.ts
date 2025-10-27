type TGetTokenOptions = { clickTag?: string; };
type TChallengesRunner = (options?: TGetTokenOptions) => PromiseLike<string>;
type TInitChallengesOptions = {
    api?: string;
    clientKey: string;
    withoutSessions?: boolean;
    withoutReload?: boolean;
    withoutRemoteStorage?: boolean;
};
declare const setUserId: (userId: string) => void, initChallenges: ({ api, clientKey, withoutSessions }: TInitChallengesOptions) => PromiseLike<TChallengesRunner>, runChallenge: TChallengesRunner;
export { initChallenges, runChallenge, setUserId };
export type { TInitChallengesOptions, TGetTokenOptions, TChallengesRunner }
