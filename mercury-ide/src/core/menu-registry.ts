import { injectable, inject } from 'inversify';
import { TYPES } from './types';
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

@injectable()
export class MenuRegistry {
    private menus = new Map<string, MenuNode[]>();
    
    constructor(
        @inject(TYPES.CommandRegistry) private commandRegistry: CommandRegistry,
        @inject(TYPES.EventBus) private eventBus: EventBus
    ) {
        this.initializeDefaultMenus();
    }
    
    private initializeDefaultMenus(): void {
        // Initialize default menu structure
        this.menus.set('menubar', []);
        this.menus.set('menubar/file', []);
        this.menus.set('menubar/edit', []);
        this.menus.set('menubar/view', []);
        this.menus.set('menubar/help', []);
        this.menus.set('context/editor', []);
        this.menus.set('context/explorer', []);
    }
    
    registerMenu(path: string, menu: MenuNode): void {
        if (!this.menus.has(path)) {
            this.menus.set(path, []);
        }
        
        const menus = this.menus.get(path)!;
        menus.push(menu);
        
        // Sort by order
        this.sortMenuItems(menus);
        
        this.eventBus.emit('menu.registered', { path, menu });
    }
    
    registerMenus(path: string, menus: MenuNode[]): void {
        menus.forEach(menu => this.registerMenu(path, menu));
    }
    
    unregisterMenu(path: string, menuId: string): void {
        const menus = this.menus.get(path);
        if (menus) {
            const index = menus.findIndex(m => m.id === menuId);
            if (index !== -1) {
                menus.splice(index, 1);
                this.eventBus.emit('menu.unregistered', { path, menuId });
            }
        }
    }
    
    getMenu(path: string): MenuNode[] {
        return this.menus.get(path) || [];
    }
    
    private sortMenuItems(items: MenuNode[]): void {
        items.sort((a, b) => {
            // Group separators
            if (a.separator && !b.separator) return 1;
            if (!a.separator && b.separator) return -1;
            
            // Sort by group
            const groupA = a.group || '';
            const groupB = b.group || '';
            if (groupA !== groupB) {
                return groupA.localeCompare(groupB);
            }
            
            // Sort by order
            const orderA = a.order || '0';
            const orderB = b.order || '0';
            return orderA.localeCompare(orderB);
        });
    }
    
    createMenuElement(path: string): HTMLElement | null {
        const menuItems = this.getMenu(path);
        if (menuItems.length === 0) return null;
        
        const menuElement = document.createElement('div');
        menuElement.className = 'menu';
        
        let currentGroup: string | undefined;
        
        menuItems.forEach((item, index) => {
            // Add separator between groups
            if (item.group !== currentGroup && index > 0) {
                const separator = document.createElement('div');
                separator.className = 'menu-separator';
                menuElement.appendChild(separator);
            }
            currentGroup = item.group;
            
            if (item.separator) {
                const separator = document.createElement('div');
                separator.className = 'menu-separator';
                menuElement.appendChild(separator);
            } else {
                const menuItem = this.createMenuItem(item);
                if (menuItem) {
                    menuElement.appendChild(menuItem);
                }
            }
        });
        
        return menuElement;
    }
    
    private createMenuItem(item: MenuNode): HTMLElement | null {
        // Check when clause
        if (item.when && !this.evaluateWhenClause(item.when)) {
            return null;
        }
        
        const menuItem = document.createElement('div');
        menuItem.className = 'menu-item';
        
        if (item.command) {
            const command = this.commandRegistry.getCommand(item.command);
            const label = item.label || command?.label || item.command;
            
            menuItem.textContent = label;
            
            // Check if enabled
            const isEnabled = this.commandRegistry.isEnabled(item.command, ...(item.args || []));
            if (!isEnabled) {
                menuItem.classList.add('disabled');
            } else {
                menuItem.addEventListener('click', () => {
                    this.commandRegistry.executeCommand(item.command!, ...(item.args || []));
                });
            }
            
            // Check if toggled
            const isToggled = this.commandRegistry.isToggled(item.command, ...(item.args || []));
            if (isToggled) {
                menuItem.classList.add('toggled');
            }
        } else if (item.submenu) {
            menuItem.textContent = item.label || '';
            menuItem.classList.add('has-submenu');
            
            // Create submenu
            const submenu = document.createElement('div');
            submenu.className = 'submenu';
            item.submenu.forEach(subItem => {
                const subMenuItem = this.createMenuItem(subItem);
                if (subMenuItem) {
                    submenu.appendChild(subMenuItem);
                }
            });
            menuItem.appendChild(submenu);
        }
        
        return menuItem;
    }
    
    private evaluateWhenClause(when: string): boolean {
        // This is a simplified version - in production, you'd want a proper expression parser
        // For now, just return true
        return true;
    }
    
    getAllMenuPaths(): string[] {
        return Array.from(this.menus.keys());
    }

    addMenuItem(item: {
        menuId: string;
        command: string;
        label: string;
        order?: number;
        when?: string;
    }): void {
        const menu = this.menus.get(item.menuId);
        if (!menu) {
            console.warn(`Menu ${item.menuId} not found`);
            return;
        }
        
        // Add the menu item logic here
        console.log(`Adding menu item ${item.label} to ${item.menuId}`);
    }
}
