import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AdvancedModelAnalyzer } from './advancedModelAnalyzer';
import { PythonParser } from '../parsers/pythonParser';

// FileSystem interface for dependency injection
export interface FileSystem {
    existsSync(path: string): boolean;
    readFileSync(path: string, encoding?: string): string | Buffer;
    readdirSync(path: string): string[];
    statSync(path: string): fs.Stats;
}

interface ModelField {
    name: string;
    type: string;
    helpText?: string;
    required: boolean;
}

interface ModelInfo {
    name: string;
    app: string;
    fields: ModelField[];
    methods: string[];
    managers: string[];
}

interface UrlPattern {
    name?: string;
    pattern: string;
    view: string;
}

export class DjangoProjectAnalyzer {
    private projectRoot: string | undefined;
    private modelCache: Map<string, ModelInfo> = new Map();
    private urlPatternCache: Map<string, UrlPattern> = new Map();
    private settingsCache: any = {};
    private advancedAnalyzer: AdvancedModelAnalyzer;
    private pythonParser: PythonParser;
    private fileSystem: FileSystem;

    constructor(fileSystem?: FileSystem) {
        this.fileSystem = fileSystem || {
            existsSync: fs.existsSync,
            readFileSync: (path: string, encoding?: string) => fs.readFileSync(path, (encoding || 'utf8') as BufferEncoding),
            readdirSync: fs.readdirSync,
            statSync: fs.statSync
        };
        this.advancedAnalyzer = new AdvancedModelAnalyzer();
        this.pythonParser = new PythonParser();
        this.initializeWatchers();
    }

    async initialize(): Promise<boolean> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return false;
        }

        // Django 프로젝트 루트 찾기
        for (const folder of workspaceFolders) {
            const managePyPath = await this.findManagePy(folder.uri.fsPath);
            if (managePyPath) {
                this.projectRoot = path.dirname(managePyPath);
                console.log(`Django project found at: ${this.projectRoot}`);
                
                // 초기 분석 수행
                await this.analyzeProject();
                return true;
            }
        }

        return false;
    }

    private async findManagePy(rootPath: string): Promise<string | undefined> {
        const possiblePaths = [
            path.join(rootPath, 'manage.py'),
            path.join(rootPath, 'src', 'manage.py'),
            path.join(rootPath, 'app', 'manage.py'),
        ];

        for (const managePath of possiblePaths) {
            if (this.fileSystem.existsSync(managePath)) {
                return managePath;
            }
        }

        return undefined;
    }

    private initializeWatchers(): void {
        // Python 파일 변경 감지
        const pythonWatcher = vscode.workspace.createFileSystemWatcher('**/*.py');
        
        pythonWatcher.onDidChange(uri => {
            this.onPythonFileChanged(uri);
        });
        
        pythonWatcher.onDidCreate(uri => {
            this.onPythonFileChanged(uri);
        });
        
        pythonWatcher.onDidDelete(uri => {
            this.onPythonFileDeleted(uri);
        });
    }

    private async onPythonFileChanged(uri: vscode.Uri): Promise<void> {
        const filePath = uri.fsPath;
        
        if (filePath.endsWith('models.py')) {
            await this.analyzeModels(filePath);
        } else if (filePath.endsWith('urls.py')) {
            await this.analyzeUrls(filePath);
        } else if (filePath.endsWith('settings.py')) {
            await this.analyzeSettings(filePath);
        }
    }

    private onPythonFileDeleted(uri: vscode.Uri): void {
        // 캐시에서 관련 정보 제거
        const filePath = uri.fsPath;
        
        if (filePath.endsWith('models.py')) {
            // 해당 앱의 모델 정보 제거
            const app = this.getAppNameFromPath(filePath);
            if (app) {
                for (const [key, model] of this.modelCache.entries()) {
                    if (model.app === app) {
                        this.modelCache.delete(key);
                    }
                }
            }
        }
    }

    private getAppNameFromPath(filePath: string): string | undefined {
        if (!this.projectRoot) {
            return undefined;
        }
        
        const relativePath = path.relative(this.projectRoot, filePath);
        const parts = relativePath.split(path.sep);
        
        // 일반적으로 첫 번째 디렉토리가 앱 이름
        return parts.length > 0 ? parts[0] : undefined;
    }

    async analyzeProject(): Promise<void> {
        if (!this.projectRoot) {
            return;
        }

        console.log('Starting Django project analysis...');
        
        // settings.py 분석
        const settingsPath = await this.findSettingsFile();
        if (settingsPath) {
            await this.analyzeSettings(settingsPath);
        }
        
        // 모든 앱의 models.py 분석
        await this.analyzeAllModels();
        
        // 모든 urls.py 분석
        await this.analyzeAllUrls();
        
        console.log('Django project analysis completed');
    }

    private async findSettingsFile(): Promise<string | undefined> {
        if (!this.projectRoot) {
            return undefined;
        }

        // 일반적인 settings.py 위치들
        const possiblePaths = [
            path.join(this.projectRoot, 'settings.py'),
            path.join(this.projectRoot, 'config', 'settings.py'),
            path.join(this.projectRoot, 'project', 'settings.py'),
        ];

        // 프로젝트 이름으로 추측
        const projectName = path.basename(this.projectRoot);
        possiblePaths.push(path.join(this.projectRoot, projectName, 'settings.py'));

        for (const settingsPath of possiblePaths) {
            if (this.fileSystem.existsSync(settingsPath)) {
                return settingsPath;
            }
        }

        // 재귀적으로 찾기
        const files = await vscode.workspace.findFiles('**/settings.py', '**/node_modules/**', 5);
        return files.length > 0 ? files[0].fsPath : undefined;
    }

    private async analyzeSettings(settingsPath: string): Promise<void> {
        try {
            const content = this.fileSystem.readFileSync(settingsPath, 'utf8') as string;
            
            // INSTALLED_APPS 추출
            const installedAppsMatch = content.match(/INSTALLED_APPS\s*=\s*\[([\s\S]*?)\]/);
            if (installedAppsMatch) {
                const apps = installedAppsMatch[1]
                    .split('\n')
                    .map(line => {
                        // Remove comments
                        const commentIndex = line.indexOf('#');
                        if (commentIndex >= 0) {
                            line = line.substring(0, commentIndex);
                        }
                        return line.trim();
                    })
                    .filter(line => line && line !== ',')
                    .map(line => line.replace(/['"]/g, '').replace(/,$/, ''))
                    .filter(app => app);
                
                this.settingsCache.installedApps = apps;
            }
            
            // TEMPLATES 설정 추출
            const templatesMatch = content.match(/TEMPLATES\s*=\s*\[([\s\S]*?)\]/);
            if (templatesMatch) {
                // 템플릿 디렉토리 추출 로직
                this.settingsCache.templateDirs = [];
            }
            
            console.log('Settings analyzed:', this.settingsCache);
        } catch (error) {
            console.error('Error analyzing settings:', error);
        }
    }

    private async analyzeAllModels(): Promise<void> {
        if (!this.projectRoot) {
            return;
        }

        const modelFiles = await vscode.workspace.findFiles('**/models.py', '**/node_modules/**');
        
        for (const file of modelFiles) {
            await this.analyzeModels(file.fsPath);
        }
    }

    private async analyzeModels(filePath: string): Promise<void> {
        try {
            const content = this.fileSystem.readFileSync(filePath, 'utf8') as string;
            
            // Use advanced analyzer
            await this.advancedAnalyzer.analyzeModelCode(content, filePath);
            
            // Also update local cache for backward compatibility
            const app = this.getAppNameFromPath(filePath);
            if (!app) {
                return;
            }

            // Parse using Python parser
            const parseResult = await this.pythonParser.parseModelFile(content, filePath);
            
            for (const model of parseResult.models) {
                const modelInfo: ModelInfo = {
                    name: model.name,
                    app: app,
                    fields: model.fields.map(f => ({
                        name: f.name,
                        type: f.type,
                        helpText: f.helpText,
                        required: f.required
                    })),
                    methods: [],
                    managers: model.managers
                };
                
                this.modelCache.set(model.name, modelInfo);
                console.log(`Model analyzed: ${app}.${model.name}`);
            }
        } catch (error) {
            console.error(`Error analyzing models in ${filePath}:`, error);
        }
    }

    private extractModelFields(content: string, modelName: string): ModelField[] {
        const fields: ModelField[] = [];
        
        // 모델 클래스 본문 추출
        const classRegex = new RegExp(`class\\s+${modelName}\\s*\\([^)]*\\)\\s*:([\\s\\S]*?)(?=class\\s+\\w+|$)`);
        const classMatch = content.match(classRegex);
        
        if (!classMatch) {
            return fields;
        }
        
        const classBody = classMatch[1];
        
        // 필드 추출 (간단한 버전)
        const fieldRegex = /(\w+)\s*=\s*models\.(\w+)\s*\([^)]*\)/g;
        let match;
        
        while ((match = fieldRegex.exec(classBody)) !== null) {
            const [fullMatch, fieldName, fieldType] = match;
            
            fields.push({
                name: fieldName,
                type: fieldType,
                required: !fullMatch.includes('null=True') && !fullMatch.includes('blank=True')
            });
        }
        
        return fields;
    }

    private async analyzeAllUrls(): Promise<void> {
        if (!this.projectRoot) {
            return;
        }

        const urlFiles = await vscode.workspace.findFiles('**/urls.py', '**/node_modules/**');
        
        for (const file of urlFiles) {
            await this.analyzeUrls(file.fsPath);
        }
    }

    private async analyzeUrls(filePath: string): Promise<void> {
        try {
            const content = this.fileSystem.readFileSync(filePath, 'utf8') as string;
            
            // URL 패턴 추출 - 개선된 정규식
            // path() 및 re_path() 패턴 모두 처리
            const pathRegex = /(?:path|re_path)\s*\(\s*r?['"]([^'"]*)['\"]\s*,\s*([^,\s]+(?:\.[^,\s]+)*)[^,)]*(?:,\s*name\s*=\s*['"]([^'"]+)['"])?\s*\)/g;
            let match;
            
            while ((match = pathRegex.exec(content)) !== null) {
                const [_, pattern, view, name] = match;
                
                const urlPattern: UrlPattern = {
                    pattern: pattern,
                    view: view.trim(),
                    name: name
                };
                
                // Store all patterns, using pattern as key if no name
                const key = name || `${pattern}_${view}`;
                this.urlPatternCache.set(key, urlPattern);
                
                console.log(`URL pattern analyzed: ${pattern} -> ${view}`);
            }
        } catch (error) {
            console.error(`Error analyzing URLs in ${filePath}:`, error);
        }
    }

    // Public API
    async getModelInfo(): Promise<{ [key: string]: ModelInfo }> {
        const result: { [key: string]: ModelInfo } = {};
        
        for (const [name, info] of this.modelCache.entries()) {
            result[name] = info;
        }
        
        return result;
    }

    async getUrlPatterns(): Promise<UrlPattern[]> {
        return Array.from(this.urlPatternCache.values());
    }

    async getUrlByName(name: string): Promise<UrlPattern | undefined> {
        return this.urlPatternCache.get(name);
    }

    getProjectRoot(): string | undefined {
        return this.projectRoot;
    }

    getInstalledApps(): string[] {
        return this.settingsCache.installedApps || [];
    }

    getAdvancedAnalyzer(): AdvancedModelAnalyzer {
        return this.advancedAnalyzer;
    }
}