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
describe('Scenario 1: Django Project Initial Setup', () => {
    let setup;
    const projectPath = path.resolve(__dirname, '../../../test/fixtures/sample-projects/simple-blog');
    before(async function () {
        this.timeout(30000);
        setup = new setup_1.E2ETestSetup();
        await setup.initialize();
    });
    after(async function () {
        this.timeout(10000);
        await setup.cleanup();
    });
    it('should detect Django project and configure paths automatically', async function () {
        this.timeout(30000);
        // Step 1: Open Django project
        await setup.openWorkspace(projectPath);
        // Step 2: Check for Django detection notification
        const notifications = await setup.getNotifications();
        const djangoDetected = notifications.some(msg => msg.includes('Django project detected') ||
            msg.includes('Django Power Tools'));
        (0, chai_1.expect)(djangoDetected).to.be.true;
        // Step 3: Open a Python file with imports
        const viewsPath = path.join(projectPath, 'blog', 'views.py');
        await setup.openFile(viewsPath);
        // Step 4: Verify no import errors (check for error decorations)
        const driver = setup.getDriver();
        await driver.sleep(2000); // Wait for analysis
        // Check for error squiggles
        const errorDecorations = await driver.findElements({
            className: 'squiggly-error'
        });
        (0, chai_1.expect)(errorDecorations.length).to.equal(0, 'Should have no import errors');
    });
    it('should show Django project status in status bar', async function () {
        this.timeout(10000);
        const driver = setup.getDriver();
        // Check status bar for Django indicator
        const statusBarItems = await driver.findElements({
            className: 'statusbar-item'
        });
        let djangoStatusFound = false;
        for (const item of statusBarItems) {
            const text = await item.getText();
            if (text.includes('Django') || text.includes('django')) {
                djangoStatusFound = true;
                break;
            }
        }
        (0, chai_1.expect)(djangoStatusFound).to.be.true;
    });
});
//# sourceMappingURL=01-initial-setup.test.js.map