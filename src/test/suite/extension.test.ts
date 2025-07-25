import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('pyhub-kr.django-power-tools'));
    });

    test('Should activate', async () => {
        const ext = vscode.extensions.getExtension('pyhub-kr.django-power-tools');
        if (ext) {
            await ext.activate();
            assert.ok(true);
        }
    });

    test('Should register commands', () => {
        return vscode.commands.getCommands(true).then((commands) => {
            const djangoCommands = commands.filter(cmd => cmd.startsWith('django-power-tools.'));
            assert.ok(djangoCommands.length > 0);
        });
    });
});