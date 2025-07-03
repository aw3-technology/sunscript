import { Container, interfaces } from 'inversify';
export declare class ContributionProvider<T extends object> {
    protected readonly container: Container;
    protected readonly serviceIdentifier: interfaces.ServiceIdentifier<T>;
    protected services: T[] | undefined;
    constructor(container: Container, serviceIdentifier: interfaces.ServiceIdentifier<T>);
    getContributions(): T[];
    protected setServices(services: T[]): void;
}
export declare function bindContributionProvider(bind: interfaces.Bind, container: Container, serviceIdentifier: symbol): void;
