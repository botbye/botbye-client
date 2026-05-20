type TGetTokenOptions = {
    clickTag?: string;
};
type TChallengesRunner = (options?: TGetTokenOptions) => PromiseLike<string>;
type TInitChallengesOptions = {
    api?: string;
    clientKey: string;
    withoutSessions?: boolean;
    withoutReload?: boolean;
    withoutRemoteStorage?: boolean;
};
type TSetUserId = (userId: string) => void;
type TFactoryResponse = {
    initChallenges: (options: TInitChallengesOptions) => PromiseLike<TChallengesRunner>;
    runChallenge: TChallengesRunner;
    setUserId: TSetUserId;
};
declare const factory: (url?: string) => TFactoryResponse;
declare const initChallenges: (options: TInitChallengesOptions) => PromiseLike<TChallengesRunner>, runChallenge: TChallengesRunner, setUserId: TSetUserId;
export { initChallenges, runChallenge, setUserId, factory, type TGetTokenOptions, type TChallengesRunner, type TInitChallengesOptions, type TSetUserId, type TFactoryResponse, };
