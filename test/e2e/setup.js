"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.E2ETestSetup = void 0;
const vscode_extension_tester_1 = require("vscode-extension-tester");
class E2ETestSetup {
    async initialize() {
        // Initialize browser
        this.browser = new vscode_extension_tester_1.VSBrowser();
        this.driver = await this.browser.driver;
        // Set implicit wait
        await this.driver.manage().setTimeouts({
            implicit: 5000
        });
    }
    async openWorkspace(projectPath) {
        const workbench = new vscode_extension_tester_1.Workbench();
        await workbench.executeCommand('File: Open Folder...');
        // Handle file dialog (platform specific)
        // This is a simplified version - actual implementation may need platform detection
        await this.driver.sleep(1000);
        await this.driver.actions().sendKeys(projectPath).perform();
        await this.driver.actions().sendKeys('\n').perform();
        // Wait for workspace to load
        await this.driver.sleep(3000);
    }
    async openFile(filePath) {
        const workbench = new vscode_extension_tester_1.Workbench();
        await workbench.executeCommand('File: Open File...');
        await this.driver.sleep(1000);
        await this.driver.actions().sendKeys(filePath).perform();
        await this.driver.actions().sendKeys('\n').perform();
        return new vscode_extension_tester_1.EditorView();
    }
    async getNotifications() {
        const workbench = new vscode_extension_tester_1.Workbench();
        const notifications = await workbench.getNotifications();
        const messages = [];
        for (const notification of notifications) {
            messages.push(await notification.getMessage());
        }
        return messages;
    }
    async executeCommand(command) {
        const workbench = new vscode_extension_tester_1.Workbench();
        await workbench.executeCommand(command);
    }
    async getTerminalOutput() {
        const bottomBar = new vscode_extension_tester_1.BottomBarPanel();
        await bottomBar.toggle(true);
        // Switch to terminal tab
        await bottomBar.openTerminalView();
        // Get terminal text (simplified - actual implementation needs more work)
        await this.driver.sleep(1000);
        const terminalElement = await this.driver.findElement({ className: 'terminal' });
        return await terminalElement.getText();
    }
    async typeInEditor(text) {
        const editor = new vscode_extension_tester_1.EditorView();
        await editor.sendKeys(text);
    }
    async getAutocompleteSuggestions() {
        // Trigger autocomplete
        await this.driver.actions().sendKeys('.').perform();
        await this.driver.sleep(500);
        // Get suggestion items
        const suggestions = await this.driver.findElements({
            className: 'monaco-list-row'
        });
        const items = [];
        for (const suggestion of suggestions) {
            const label = await suggestion.findElement({ className: 'label-name' });
            items.push(await label.getText());
        }
        return items;
    }
    async cleanup() {
        if (this.browser) {
            await this.browser.quit();
        }
    }
    getDriver() {
        return this.driver;
    }
}
exports.E2ETestSetup = E2ETestSetup;
//# sourceMappingURL=setup.js.map