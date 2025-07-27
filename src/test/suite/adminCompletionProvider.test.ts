import * as assert from 'assert';
import * as vscode from 'vscode';
import { createContainer } from '../../container/inversify.config';
import { TYPES } from '../../container/types';
import { DjangoAdminCompletionProvider } from '../../completions/djangoAdminCompletionProvider';
import { DjangoAdminAnalyzer } from '../../analyzers/djangoAdminAnalyzer';
import { DjangoProjectAnalyzer } from '../../analyzers/djangoProjectAnalyzer';
import { mock } from 'ts-mockito';

suite('Django Admin Completion Provider Test Suite', () => {
    let container: ReturnType<typeof createContainer>;
    let adminCompletionProvider: DjangoAdminCompletionProvider;
    let adminAnalyzer: DjangoAdminAnalyzer;
    let projectAnalyzer: DjangoProjectAnalyzer;

    setup(() => {
        const context = mock<vscode.ExtensionContext>();
        container = createContainer(context as any);
        adminCompletionProvider = container.get<DjangoAdminCompletionProvider>(TYPES.DjangoAdminCompletionProvider);
        adminAnalyzer = container.get<DjangoAdminAnalyzer>(TYPES.DjangoAdminAnalyzer);
        projectAnalyzer = container.get<DjangoProjectAnalyzer>(TYPES.DjangoProjectAnalyzer);
    });

    test('Should provide ModelAdmin attribute completions', async () => {
        const document = await vscode.workspace.openTextDocument({
            language: 'python',
            content: `
import admin
from .models import Product

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_
`
        });

        const position = new vscode.Position(6, 9); // After 'list_'
        const completions = await adminCompletionProvider.provideCompletionItems(
            document,
            position,
            new vscode.CancellationTokenSource().token,
            { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined }
        );

        assert.ok(completions.length > 0, 'Should provide completions');
        const listDisplayCompletion = completions.find(item => item.label === 'list_display');
        assert.ok(listDisplayCompletion, 'Should include list_display');
        assert.strictEqual(listDisplayCompletion.kind, vscode.CompletionItemKind.Property);
    });

    test('Should provide ModelAdmin method completions', async () => {
        const document = await vscode.workspace.openTextDocument({
            language: 'python',
            content: `
import admin
from .models import Product

class ProductAdmin(admin.ModelAdmin):
    def get_
`
        });

        const position = new vscode.Position(5, 12); // After 'get_'
        const completions = await adminCompletionProvider.provideCompletionItems(
            document,
            position,
            new vscode.CancellationTokenSource().token,
            { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined }
        );

        assert.ok(completions.length > 0, 'Should provide completions');
        const getQuerysetCompletion = completions.find(item => item.label === 'get_queryset');
        assert.ok(getQuerysetCompletion, 'Should include get_queryset');
        assert.strictEqual(getQuerysetCompletion.kind, vscode.CompletionItemKind.Method);
    });

    test('Should provide admin decorator completions', async () => {
        const document = await vscode.workspace.openTextDocument({
            language: 'python',
            content: `
import admin
from .models import Product

@admin.
`
        });

        const position = new vscode.Position(4, 7); // After '@admin.'
        const completions = await adminCompletionProvider.provideCompletionItems(
            document,
            position,
            new vscode.CancellationTokenSource().token,
            { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: '.' }
        );

        assert.ok(completions.length > 0, 'Should provide completions');
        const registerCompletion = completions.find(item => item.label === '@admin.register');
        assert.ok(registerCompletion, 'Should include @admin.register');
    });

    test('Should provide InlineModelAdmin attribute completions', async () => {
        const document = await vscode.workspace.openTextDocument({
            language: 'python',
            content: `
import admin
from .models import ProductImage

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    ex
`
        });

        const position = new vscode.Position(6, 6); // After 'ex'
        const completions = await adminCompletionProvider.provideCompletionItems(
            document,
            position,
            new vscode.CancellationTokenSource().token,
            { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: undefined }
        );

        assert.ok(completions.length > 0, 'Should provide completions');
        const extraCompletion = completions.find(item => item.label === 'extra');
        assert.ok(extraCompletion, 'Should include extra');
        assert.strictEqual(extraCompletion.kind, vscode.CompletionItemKind.Property);
    });
});
