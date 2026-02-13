type TGetTokenOptions = { clickTag?: string; };
type TChallengesRunner = (options?: TGetTokenOptions) => PromiseLike<string>;
type TInitChallengesOptions = {
    api?: string;
    clientKey: string;
    withoutSessions?: boolean;
    withoutReload?: boolean;
    withoutRemoteStorage?: boolean;
};
type TSetUserId = (userId: string) => void;
type TInitChallenges = ({ api, clientKey, withoutSessions }: TInitChallengesOptions) => PromiseLike<TChallengesRunner>
type TFactoryResponse = {
    setUserId: TSetUserId
    initChallenges: TInitChallenges,
    runChallenge: TChallengesRunner;
}
declare const setUserId: TSetUserId,
    initChallenges: TInitChallenges,
    runChallenge: TChallengesRunner,
    factory: (api?: string) => TFactoryResponse;
export { initChallenges, runChallenge, setUserId, factory };
export type { TInitChallengesOptions, TGetTokenOptions, TChallengesRunner }
