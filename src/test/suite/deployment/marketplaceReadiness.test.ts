import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { suite, test } from 'mocha';

suite('Marketplace Readiness Tests', () => {
    const rootPath = path.join(__dirname, '../../../../');

    test('should have valid package.json', () => {
        const packageJsonPath = path.join(rootPath, 'package.json');
        assert.ok(fs.existsSync(packageJsonPath), 'package.json should exist');

        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        // Required fields
        assert.ok(packageJson.name, 'name is required');
        assert.ok(packageJson.displayName, 'displayName is required');
        assert.ok(packageJson.description, 'description is required');
        assert.ok(packageJson.version, 'version is required');
        assert.ok(packageJson.publisher, 'publisher is required');
        assert.ok(packageJson.engines?.vscode, 'vscode engine version is required');
        assert.ok(packageJson.categories?.length > 0, 'categories are required');
        assert.ok(packageJson.activationEvents?.length > 0, 'activationEvents are required');
        assert.ok(packageJson.main, 'main entry point is required');

        // Marketplace specific fields
        assert.ok(packageJson.repository, 'repository is required for marketplace');
        assert.ok(packageJson.license, 'license is required');
        assert.ok(packageJson.icon, 'icon is required for marketplace');
        assert.ok(packageJson.galleryBanner, 'galleryBanner enhances marketplace appearance');
        assert.ok(packageJson.keywords?.length > 0, 'keywords help with discoverability');
    });

    test('should have required assets', () => {
        const packageJson = JSON.parse(fs.readFileSync(path.join(rootPath, 'package.json'), 'utf8'));

        // Icon file
        if (packageJson.icon) {
            const iconPath = path.join(rootPath, packageJson.icon);
            assert.ok(fs.existsSync(iconPath), `Icon file should exist at ${packageJson.icon}`);
            
            // Check icon is PNG and reasonable size
            const iconStats = fs.statSync(iconPath);
            assert.ok(iconStats.size < 300 * 1024, 'Icon should be less than 300KB');
            assert.ok(packageJson.icon.endsWith('.png'), 'Icon should be PNG format');
        }

        // README file
        const readmePath = path.join(rootPath, 'README.md');
        assert.ok(fs.existsSync(readmePath), 'README.md is required');
        const readmeContent = fs.readFileSync(readmePath, 'utf8');
        assert.ok(readmeContent.length > 1000, 'README should have substantial content');

        // CHANGELOG file
        const changelogPath = path.join(rootPath, 'CHANGELOG.md');
        assert.ok(fs.existsSync(changelogPath), 'CHANGELOG.md is required for marketplace');

        // LICENSE file
        const licensePath = path.join(rootPath, 'LICENSE');
        assert.ok(fs.existsSync(licensePath), 'LICENSE file is required');
    });

    test('should have valid .vscodeignore', () => {
        const vscodeignorePath = path.join(rootPath, '.vscodeignore');
        assert.ok(fs.existsSync(vscodeignorePath), '.vscodeignore should exist');

        const content = fs.readFileSync(vscodeignorePath, 'utf8');
        
        // Should ignore test files
        assert.ok(content.includes('src/test/**'), 'Should ignore test files');
        assert.ok(content.includes('**/*.test.ts'), 'Should ignore test files');
        
        // Should ignore source files
        assert.ok(content.includes('src/**'), 'Should ignore TypeScript source');
        assert.ok(content.includes('!out/**'), 'Should include compiled output');
        
        // Should ignore development files
        assert.ok(content.includes('.vscode-test/**'), 'Should ignore test workspace');
        assert.ok(content.includes('node_modules/**'), 'Should ignore node_modules');
        assert.ok(content.includes('.github/**'), 'Should ignore GitHub files');
    });

    test('should have no sensitive information', () => {
        const packageJson = JSON.parse(fs.readFileSync(path.join(rootPath, 'package.json'), 'utf8'));
        
        // Check for common sensitive patterns
        const jsonString = JSON.stringify(packageJson);
        assert.ok(!jsonString.includes('password'), 'Should not contain passwords');
        assert.ok(!jsonString.includes('secret'), 'Should not contain secrets');
        assert.ok(!jsonString.includes('token'), 'Should not contain tokens');
        assert.ok(!jsonString.includes('apiKey') && !jsonString.includes('api_key'), 'Should not contain API keys');
        
        // Check repository URL is public
        if (packageJson.repository?.url) {
            assert.ok(
                packageJson.repository.url.includes('github.com') ||
                packageJson.repository.url.includes('gitlab.com'),
                'Repository should be on public platform'
            );
        }
    });

    test('should have production dependencies only', () => {
        const packageJson = JSON.parse(fs.readFileSync(path.join(rootPath, 'package.json'), 'utf8'));
        
        // No dependencies should be in production (all in devDependencies)
        assert.ok(
            !packageJson.dependencies || Object.keys(packageJson.dependencies).length === 0,
            'VS Code extensions should have no production dependencies'
        );
        
        // Should have devDependencies
        assert.ok(
            packageJson.devDependencies && Object.keys(packageJson.devDependencies).length > 0,
            'Should have development dependencies'
        );
    });

    test('should have valid version number', () => {
        const packageJson = JSON.parse(fs.readFileSync(path.join(rootPath, 'package.json'), 'utf8'));
        const version = packageJson.version;
        
        // Semantic versioning
        const versionRegex = /^\d+\.\d+\.\d+$/;
        assert.ok(versionRegex.test(version), 'Version should follow semantic versioning (x.y.z)');
        
        // Should start with 0.x.x for initial release
        const [major] = version.split('.');
        assert.ok(major === '0', 'Initial release should be 0.x.x');
    });
});