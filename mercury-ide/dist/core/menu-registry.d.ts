import { CommandRegistry } from './command-registry';
import { EventBus } from './event-bus';
export interface MenuNode {
    id: string;
    label?: string;
    order?: string;
    submenu?: MenuNode[];
    command?: string;
    args?: any[];
    when?: string;
    group?: string;
    separator?: boolean;
}
export interface MenuPath {
    path: string[];
}
export declare class MenuRegistry {
    private commandRegistry;
    private eventBus;
    private menus;
    constructor(commandRegistry: CommandRegistry, eventBus: EventBus);
    private initializeDefaultMenus;
    registerMenu(path: string, menu: MenuNode): void;
    registerMenus(path: string, menus: MenuNode[]): void;
    unregisterMenu(path: string, menuId: string): void;
    getMenu(path: string): MenuNode[];
    private sortMenuItems;
    createMenuElement(path: string): HTMLElement | null;
    private createMenuItem;
    private evaluateWhenClause;
    getAllMenuPaths(): string[];
    addMenuItem(item: {
        menuId: string;
        command: string;
        label: string;
        order?: number;
        when?: string;
    }): void;
}
