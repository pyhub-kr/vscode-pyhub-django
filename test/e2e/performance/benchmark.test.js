"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const path = __importStar(require("path"));
const setup_1 = require("../setup");
const vscode_extension_tester_1 = require("vscode-extension-tester");
const perf_hooks_1 = require("perf_hooks");
describe('Performance Benchmarks', () => {
    let setup;
    const projectPath = path.resolve(__dirname, '../../../test/fixtures/sample-projects/complex-ecommerce');
    // Performance thresholds (in milliseconds)
    const THRESHOLDS = {
        autocomplete: 100,
        goToDefinition: 200,
        initialScan: 5000,
        memoryUsage: 100 * 1024 * 1024 // Max 100MB memory usage
    };
    before(async function () {
        this.timeout(30000);
        setup = new setup_1.E2ETestSetup();
        await setup.initialize();
    });
    after(async function () {
        this.timeout(10000);
        await setup.cleanup();
    });
    it('should complete initial project scan within threshold', async function () {
        this.timeout(30000);
        const startTime = perf_hooks_1.performance.now();
        await setup.openWorkspace(projectPath);
        // Wait for Django project detection
        let detected = false;
        const maxWaitTime = THRESHOLDS.initialScan;
        const checkInterval = 500;
        let elapsed = 0;
        while (!detected && elapsed < maxWaitTime) {
            const notifications = await setup.getNotifications();
            detected = notifications.some(msg => msg.includes('Django project detected') ||
                msg.includes('Django Power Tools'));
            if (!detected) {
                await setup.getDriver().sleep(checkInterval);
                elapsed += checkInterval;
            }
        }
        const endTime = perf_hooks_1.performance.now();
        const scanTime = endTime - startTime;
        (0, chai_1.expect)(detected).to.be.true;
        (0, chai_1.expect)(scanTime).to.be.lessThan(THRESHOLDS.initialScan, `Initial scan took ${scanTime}ms, expected < ${THRESHOLDS.initialScan}ms`);
    });
    it('should provide autocomplete within performance threshold', async function () {
        this.timeout(20000);
        // Open a Python file
        const viewsPath = path.join(projectPath, 'products', 'views.py');
        const editor = await setup.openFile(viewsPath);
        // Type to trigger autocomplete
        await editor.sendKeys('\n\ndef perf_test(request):\n    products = Product.objects.');
        // Measure autocomplete response time
        const startTime = perf_hooks_1.performance.now();
        // Wait for autocomplete to appear
        let autocompleteVisible = false;
        const maxWait = 2000;
        let waited = 0;
        while (!autocompleteVisible && waited < maxWait) {
            try {
                const contentAssist = await vscode_extension_tester_1.ContentAssist.create();
                const items = await contentAssist.getItems();
                autocompleteVisible = items.length > 0;
            }
            catch (e) {
                // ContentAssist not ready yet
            }
            if (!autocompleteVisible) {
                await setup.getDriver().sleep(10);
                waited += 10;
            }
        }
        const endTime = perf_hooks_1.performance.now();
        const responseTime = endTime - startTime;
        (0, chai_1.expect)(autocompleteVisible).to.be.true;
        (0, chai_1.expect)(responseTime).to.be.lessThan(THRESHOLDS.autocomplete, `Autocomplete took ${responseTime}ms, expected < ${THRESHOLDS.autocomplete}ms`);
    });
    it('should handle Go to Definition within performance threshold', async function () {
        this.timeout(20000);
        // Create a template with URL tag
        await setup.executeCommand('File: New File');
        const editor = new vscode_extension_tester_1.EditorView();
        await editor.sendKeys(`{% url 'products:product_list' %}`);
        // Position cursor on URL name
        await editor.setCursor(1, 15); // Position on 'products:product_list'
        // Measure Go to Definition time
        const startTime = perf_hooks_1.performance.now();
        await setup.executeCommand('Go to Definition');
        // Wait for navigation
        await setup.getDriver().sleep(500);
        const endTime = perf_hooks_1.performance.now();
        const navigationTime = endTime - startTime;
        (0, chai_1.expect)(navigationTime).to.be.lessThan(THRESHOLDS.goToDefinition, `Go to Definition took ${navigationTime}ms, expected < ${THRESHOLDS.goToDefinition}ms`);
    });
    it('should maintain reasonable memory usage', async function () {
        this.timeout(30000);
        // Perform various operations to stress test memory
        const operations = [
            // Open multiple files
            async () => {
                const files = [
                    'products/models.py',
                    'products/views.py',
                    'products/forms.py',
                    'products/urls.py'
                ];
                for (const file of files) {
                    await setup.openFile(path.join(projectPath, file));
                    await setup.getDriver().sleep(500);
                }
            },
            // Trigger multiple autocompletes
            async () => {
                const editor = new vscode_extension_tester_1.EditorView();
                for (let i = 0; i < 10; i++) {
                    await editor.sendKeys(`\nProduct.objects.`);
                    await setup.getDriver().sleep(200);
                    await editor.sendKeys('all()');
                }
            }
        ];
        // Execute operations
        for (const operation of operations) {
            await operation();
        }
        // Check memory usage (this is a simplified check)
        // In real implementation, you'd use VS Code's performance API
        const driver = setup.getDriver();
        const memoryInfo = await driver.executeScript(`
            return performance.memory ? performance.memory.usedJSHeapSize : 0;
        `);
        if (memoryInfo) {
            (0, chai_1.expect)(memoryInfo).to.be.lessThan(THRESHOLDS.memoryUsage, `Memory usage ${memoryInfo / 1024 / 1024}MB exceeds threshold`);
        }
    });
    it('should handle large projects efficiently', async function () {
        this.timeout(60000);
        // Test with multiple URL patterns and models
        // This simulates a large project scenario
        const measureOperationTime = async (operation, name) => {
            const start = perf_hooks_1.performance.now();
            await operation();
            const end = perf_hooks_1.performance.now();
            return end - start;
        };
        // Test 1: Autocomplete in large file
        const autocompleteTime = await measureOperationTime(async () => {
            const editor = new vscode_extension_tester_1.EditorView();
            await editor.sendKeys('\n\nProduct.objects.');
            await setup.getDriver().sleep(500);
        }, 'Autocomplete in large project');
        (0, chai_1.expect)(autocompleteTime).to.be.lessThan(THRESHOLDS.autocomplete * 2, 'Autocomplete should remain fast even in large projects');
        // Test 2: URL pattern matching
        const urlMatchTime = await measureOperationTime(async () => {
            await setup.executeCommand('File: New File');
            const editor = new vscode_extension_tester_1.EditorView();
            await editor.sendKeys(`{% url 'products:`);
            await setup.getDriver().sleep(500);
        }, 'URL pattern matching');
        (0, chai_1.expect)(urlMatchTime).to.be.lessThan(THRESHOLDS.autocomplete * 2, 'URL pattern matching should remain fast');
    });
});
//# sourceMappingURL=benchmark.test.js.map