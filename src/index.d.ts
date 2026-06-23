type TGetTokenOptions = {
    clickTag?: string;
};
type TChallengesRunner = (options?: TGetTokenOptions) => PromiseLike<string>;
type TPhishingInitOptions = {
    api?: string;
    clientKey: string;
};
type TPhishingCatcherGetterOptions = {
    url?: string;
    id?: string;
    type?: "PNG" | "OBJECT";
    skipExecution?: boolean;
    innerUrl?: string;
};
type TPhishingCatcherGetter = (options?: TPhishingCatcherGetterOptions) => HTMLElement;
type TPhishingApi = {
    getCatcher: TPhishingCatcherGetter;
};
type TPhishingInit = (options: TPhishingInitOptions) => PromiseLike<TPhishingApi>;
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
    initPhishing: TPhishingInit;
};
declare const factory: (api?: string) => TFactoryResponse;
declare const initChallenges: (options: TInitChallengesOptions) => PromiseLike<TChallengesRunner>, runChallenge: TChallengesRunner, setUserId: TSetUserId, initPhishing: TPhishingInit;
export { initChallenges, runChallenge, setUserId, factory, initPhishing, type TGetTokenOptions, type TChallengesRunner, type TInitChallengesOptions, type TSetUserId, type TFactoryResponse, };
