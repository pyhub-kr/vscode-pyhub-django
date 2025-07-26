import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as sinon from 'sinon';
import { DjangoProjectAnalyzer } from '../../../analyzers/djangoProjectAnalyzer';
import { UrlPatternAnalyzer } from '../../../analyzers/urlPatternAnalyzer';
import { ProjectPathConfigurator } from '../../../projectPathConfigurator';

suite('E2E - Different Project Structures', () => {
    let sandbox: sinon.SinonSandbox;
    const fixturesPath = path.join(__dirname, '../../../../test/fixtures/sample-projects');

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('should handle simple blog project structure', async () => {
        const projectPath = path.join(fixturesPath, 'simple-blog');
        const analyzer = new DjangoProjectAnalyzer();
        
        // Mock workspace to point to our test project
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([{
            uri: vscode.Uri.file(projectPath),
            name: 'simple-blog',
            index: 0
        }]);

        const initialized = await analyzer.initialize();
        assert.strictEqual(initialized, true, 'Should initialize with simple blog project');

        const models = await analyzer.getModelInfo();
        assert.ok('Post' in models, 'Should find Post model');
        assert.ok('Comment' in models, 'Should find Comment model');
        
        // Check if custom manager is detected
        const postModel = models['Post'];
        assert.ok(postModel.fields.some(f => f.name === 'title'), 'Should have title field');
    });

    test('should handle multi-app CMS project structure', async () => {
        const projectPath = path.join(fixturesPath, 'multi-app-cms');
        const urlAnalyzer = new UrlPatternAnalyzer();
        
        // Mock findFiles to return our test URLs
        sandbox.stub(vscode.workspace, 'findFiles').resolves([
            vscode.Uri.file(path.join(projectPath, 'cms_project/urls.py')),
            vscode.Uri.file(path.join(projectPath, 'pages/urls.py')),
            vscode.Uri.file(path.join(projectPath, 'api/urls.py')),
        ]);

        await urlAnalyzer.scanWorkspace();
        const patterns = urlAnalyzer.getAllUrlPatterns();
        
        // Should find patterns from multiple apps
        assert.ok(patterns.some(p => p.appName === 'pages'), 'Should find pages app URLs');
        assert.ok(patterns.some(p => p.appName === 'api'), 'Should find api app URLs');
    });

    test('should configure paths correctly for nested project', async () => {
        const configurator = new ProjectPathConfigurator();
        const projectPath = path.join(fixturesPath, 'simple-blog');
        
        // Mock workspace configuration
        const configStub = {
            get: sandbox.stub().returns([]),
            update: sandbox.stub().resolves()
        };
        sandbox.stub(vscode.workspace, 'getConfiguration').returns(configStub as any);

        await configurator.addProjectRootToPythonPath(projectPath);
        
        assert.ok(configStub.update.calledOnce, 'Should update configuration');
        assert.deepStrictEqual(
            configStub.update.firstCall.args[1],
            [projectPath],
            'Should add project root to Python paths'
        );
    });
});