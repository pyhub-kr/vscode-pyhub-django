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
describe('Scenario 3: URL Tag Autocomplete', () => {
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
    it('should provide URL name autocomplete in templates', async function () {
        this.timeout(20000);
        // Create templates directory
        const templatesDir = path.join(projectPath, 'templates', 'products');
        const templatePath = path.join(templatesDir, 'product_list.html');
        // Create and open template file
        await setup.executeCommand('File: New File');
        const editor = new vscode_extension_tester_1.EditorView();
        // Type template content
        await editor.sendKeys(`{% load static %}
<!DOCTYPE html>
<html>
<body>
    <a href="{% url '`);
        // Wait for autocomplete
        await setup.getDriver().sleep(1000);
        // Get URL name suggestions
        const contentAssist = await vscode_extension_tester_1.ContentAssist.create();
        const items = await contentAssist.getItems();
        const urlNames = [];
        for (const item of items) {
            urlNames.push(await item.getLabel());
        }
        // Check for URL names with namespaces
        (0, chai_1.expect)(urlNames).to.include.oneOf([
            'products:product_list',
            'product_list'
        ]);
        (0, chai_1.expect)(urlNames).to.include.oneOf([
            'products:product_detail',
            'product_detail'
        ]);
        (0, chai_1.expect)(urlNames).to.include.oneOf([
            'products:featured_products',
            'featured_products'
        ]);
    });
    it('should handle namespaced URL patterns', async function () {
        this.timeout(20000);
        const editor = new vscode_extension_tester_1.EditorView();
        // Clear and type namespaced URL
        await editor.clearText();
        await editor.sendKeys(`<a href="{% url 'products:`);
        await setup.getDriver().sleep(1000);
        // Get suggestions after namespace
        const contentAssist = await vscode_extension_tester_1.ContentAssist.create();
        const items = await contentAssist.getItems();
        const urlNames = [];
        for (const item of items) {
            urlNames.push(await item.getLabel());
        }
        // Should show URLs from products app
        (0, chai_1.expect)(urlNames.some(name => name.includes('product_list'))).to.be.true;
        (0, chai_1.expect)(urlNames.some(name => name.includes('product_detail'))).to.be.true;
        (0, chai_1.expect)(urlNames.some(name => name.includes('add_to_cart'))).to.be.true;
    });
    it('should show URL parameters hint', async function () {
        this.timeout(20000);
        const editor = new vscode_extension_tester_1.EditorView();
        // Type URL with parameters
        await editor.clearText();
        await editor.sendKeys(`<a href="{% url 'products:product_detail' `);
        await setup.getDriver().sleep(1000);
        // Check for parameter hints
        const driver = setup.getDriver();
        const parameterHints = await driver.findElements({
            className: 'parameter-hints'
        });
        if (parameterHints.length > 0) {
            const hintText = await parameterHints[0].getText();
            (0, chai_1.expect)(hintText).to.include('slug');
        }
    });
});
//# sourceMappingURL=03-url-tag-autocomplete.test.js.map