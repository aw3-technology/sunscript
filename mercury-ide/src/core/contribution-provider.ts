import { injectable, Container, interfaces } from 'inversify';

@injectable()
export class ContributionProvider<T extends object> {
    protected services: T[] | undefined;
    
    constructor(
        protected readonly container: Container,
        protected readonly serviceIdentifier: interfaces.ServiceIdentifier<T>
    ) {}
    
    getContributions(): T[] {
        if (this.services === undefined) {
            const currentServices: T[] = [];
            
            try {
                const bound = this.container.isBound(this.serviceIdentifier);
                if (bound) {
                    const services = this.container.getAll(this.serviceIdentifier);
                    currentServices.push(...services);
                }
            } catch (error) {
                console.error(`Error getting contributions for ${this.serviceIdentifier.toString()}:`, error);
            }
            
            this.services = currentServices;
        }
        
        return this.services;
    }
    
    protected setServices(services: T[]): void {
        this.services = services;
    }
}

export function bindContributionProvider(bind: interfaces.Bind, container: Container, serviceIdentifier: symbol): void {
    bind(ContributionProvider).toConstantValue(
        new ContributionProvider(container, serviceIdentifier)
    );
}