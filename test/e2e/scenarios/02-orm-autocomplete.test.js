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
describe('Scenario 2: Django ORM Autocomplete', () => {
    let setup;
    const projectPath = path.resolve(__dirname, '../../../test/fixtures/sample-projects/complex-ecommerce');
    before(async function () {
        this.timeout(30000);
        setup = new setup_1.E2ETestSetup();
        await setup.initialize();
        await setup.openWorkspace(projectPath);
    });
    after(async function () {
        this.timeout(10000);
        await setup.cleanup();
    });
    it('should provide QuerySet method autocomplete', async function () {
        this.timeout(20000);
        // Open views.py
        const viewsPath = path.join(projectPath, 'products', 'views.py');
        const editor = await setup.openFile(viewsPath);
        // Go to end of file and add new function
        await editor.sendKeys('\n\ndef test_autocomplete(request):\n    products = Product.objects.');
        // Wait for autocomplete to appear
        await setup.getDriver().sleep(1000);
        // Get autocomplete suggestions
        const contentAssist = await vscode_extension_tester_1.ContentAssist.create();
        const items = await contentAssist.getItems();
        const methodNames = [];
        for (const item of items) {
            methodNames.push(await item.getLabel());
        }
        // Check for common QuerySet methods
        (0, chai_1.expect)(methodNames).to.include('all');
        (0, chai_1.expect)(methodNames).to.include('filter');
        (0, chai_1.expect)(methodNames).to.include('exclude');
        (0, chai_1.expect)(methodNames).to.include('get');
        (0, chai_1.expect)(methodNames).to.include('create');
        (0, chai_1.expect)(methodNames).to.include('count');
        (0, chai_1.expect)(methodNames).to.include('exists');
        (0, chai_1.expect)(methodNames).to.include('order_by');
        (0, chai_1.expect)(methodNames).to.include('select_related');
        (0, chai_1.expect)(methodNames).to.include('prefetch_related');
    });
    it('should provide model field autocomplete in filter', async function () {
        this.timeout(20000);
        const editor = new vscode_extension_tester_1.EditorView();
        // Continue typing
        await editor.sendKeys('filter(');
        await setup.getDriver().sleep(1000);
        // Get field suggestions
        const contentAssist = await vscode_extension_tester_1.ContentAssist.create();
        const items = await contentAssist.getItems();
        const fieldNames = [];
        for (const item of items) {
            fieldNames.push(await item.getLabel());
        }
        // Check for Product model fields
        (0, chai_1.expect)(fieldNames).to.include('name');
        (0, chai_1.expect)(fieldNames).to.include('price');
        (0, chai_1.expect)(fieldNames).to.include('category');
        (0, chai_1.expect)(fieldNames).to.include('stock');
        (0, chai_1.expect)(fieldNames).to.include('is_available');
    });
    it('should provide field lookup autocomplete', async function () {
        this.timeout(20000);
        const editor = new vscode_extension_tester_1.EditorView();
        // Type field name with __
        await editor.sendKeys('name__');
        await setup.getDriver().sleep(1000);
        // Get lookup suggestions
        const contentAssist = await vscode_extension_tester_1.ContentAssist.create();
        const items = await contentAssist.getItems();
        const lookups = [];
        for (const item of items) {
            lookups.push(await item.getLabel());
        }
        // Check for string field lookups
        (0, chai_1.expect)(lookups).to.include('icontains');
        (0, chai_1.expect)(lookups).to.include('contains');
        (0, chai_1.expect)(lookups).to.include('startswith');
        (0, chai_1.expect)(lookups).to.include('endswith');
        (0, chai_1.expect)(lookups).to.include('exact');
        (0, chai_1.expect)(lookups).to.include('iexact');
    });
    it('should provide custom manager method autocomplete', async function () {
        this.timeout(20000);
        const editor = new vscode_extension_tester_1.EditorView();
        // Clear and type custom manager access
        await editor.clearText();
        await editor.sendKeys('\n\ndef test_custom_manager(request):\n    products = Product.objects.');
        await setup.getDriver().sleep(1000);
        // Get suggestions
        const contentAssist = await vscode_extension_tester_1.ContentAssist.create();
        const items = await contentAssist.getItems();
        const methodNames = [];
        for (const item of items) {
            methodNames.push(await item.getLabel());
        }
        // Check for custom manager methods
        (0, chai_1.expect)(methodNames).to.include('available');
        (0, chai_1.expect)(methodNames).to.include('featured');
        (0, chai_1.expect)(methodNames).to.include('on_sale');
    });
});
//# sourceMappingURL=02-orm-autocomplete.test.js.map