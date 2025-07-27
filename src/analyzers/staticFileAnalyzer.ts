import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { injectable, inject } from 'inversify';
import { TYPES } from '../container/types';
import { DjangoProjectAnalyzer } from './djangoProjectAnalyzer';

export interface StaticFile {
    relativePath: string;
    absolutePath: string;
    type: 'css' | 'js' | 'image' | 'font' | 'other';
    size: number;
}

export interface StaticDirectory {
    path: string;
    priority: number; // Order in STATICFILES_DIRS
}

@injectable()
export class StaticFileAnalyzer {
    private staticFiles: Map<string, StaticFile> = new Map();
    private staticDirectories: StaticDirectory[] = [];
    private fileWatcher: vscode.FileSystemWatcher | undefined;
    private isInitialized: boolean = false;

    constructor(
        @inject(TYPES.DjangoProjectAnalyzer) private projectAnalyzer: DjangoProjectAnalyzer
    ) {}

    public async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        await this.analyzeStaticDirectories();
        this.setupFileWatcher();
        this.isInitialized = true;
    }

    public getStaticFiles(): StaticFile[] {
        return Array.from(this.staticFiles.values());
    }

    public getStaticFilesInDirectory(directory: string): StaticFile[] {
        return this.getStaticFiles().filter(file => 
            file.relativePath.startsWith(directory)
        );
    }

    public searchStaticFiles(query: string): StaticFile[] {
        const lowerQuery = query.toLowerCase();
        return this.getStaticFiles().filter(file =>
            file.relativePath.toLowerCase().includes(lowerQuery)
        );
    }

    private async analyzeStaticDirectories(): Promise<void> {
        // Get Django project root
        const projectRoot = this.projectAnalyzer.getProjectRoot();
        if (!projectRoot) {
            return;
        }

        const projectRoots = [projectRoot];
        for (const projectRoot of projectRoots) {
            // Parse settings.py to find static directories
            const staticDirs = await this.parseStaticSettings(projectRoot);
            
            // Always check default 'static' directory
            const defaultStaticDir = path.join(projectRoot, 'static');
            if (fs.existsSync(defaultStaticDir)) {
                staticDirs.unshift(defaultStaticDir);
            }

            // Also check app-specific static directories
            const appDirs = await this.findAppStaticDirectories(projectRoot);
            staticDirs.push(...appDirs);

            // Scan each directory
            for (let i = 0; i < staticDirs.length; i++) {
                const dir = staticDirs[i];
                if (fs.existsSync(dir)) {
                    this.staticDirectories.push({
                        path: dir,
                        priority: i
                    });
                    await this.scanStaticDirectory(dir);
                }
            }
        }
    }

    private async parseStaticSettings(projectRoot: string): Promise<string[]> {
        const staticDirs: string[] = [];
        
        // Find settings.py file
        const settingsFile = await this.findSettingsFile(projectRoot);
        if (!settingsFile) {
            return staticDirs;
        }

        try {
            const content = fs.readFileSync(settingsFile, 'utf-8');
            
            // Extract STATICFILES_DIRS
            const staticDirsMatch = content.match(/STATICFILES_DIRS\s*=\s*\[([\s\S]*?)\]/);
            if (staticDirsMatch) {
                const dirsContent = staticDirsMatch[1];
                const dirMatches = dirsContent.matchAll(/['"]([^'"]+)['"]/g);
                
                for (const match of dirMatches) {
                    const dirPath = match[1];
                    // Resolve relative paths
                    const absolutePath = path.isAbsolute(dirPath) 
                        ? dirPath 
                        : path.join(projectRoot, dirPath);
                    staticDirs.push(absolutePath);
                }
            }
        } catch (error) {
            console.error('Error parsing settings.py:', error);
        }

        return staticDirs;
    }

    private async findSettingsFile(projectRoot: string): Promise<string | undefined> {
        const possiblePaths = [
            path.join(projectRoot, 'settings.py'),
            path.join(projectRoot, projectRoot.split(path.sep).pop() || '', 'settings.py'),
            path.join(projectRoot, 'config', 'settings.py'),
            path.join(projectRoot, 'settings', 'base.py'),
            path.join(projectRoot, 'settings', 'local.py')
        ];

        for (const settingsPath of possiblePaths) {
            if (fs.existsSync(settingsPath)) {
                return settingsPath;
            }
        }

        // Search for any settings.py file
        const files = await vscode.workspace.findFiles('**/settings.py', '**/node_modules/**', 5);
        if (files.length > 0) {
            return files[0].fsPath;
        }

        return undefined;
    }

    private async findAppStaticDirectories(projectRoot: string): Promise<string[]> {
        const appStaticDirs: string[] = [];
        
        // Find all apps (directories with __init__.py)
        const files = await vscode.workspace.findFiles('**/__init__.py', '**/node_modules/**');
        
        for (const file of files) {
            const appDir = path.dirname(file.fsPath);
            const staticDir = path.join(appDir, 'static');
            
            if (fs.existsSync(staticDir) && !appStaticDirs.includes(staticDir)) {
                appStaticDirs.push(staticDir);
            }
        }

        return appStaticDirs;
    }

    private async scanStaticDirectory(directory: string): Promise<void> {
        const files = await this.walkDirectory(directory);
        
        for (const file of files) {
            const relativePath = path.relative(directory, file).replace(/\\/g, '/');
            const stats = fs.statSync(file);
            
            this.staticFiles.set(file, {
                relativePath,
                absolutePath: file,
                type: this.getFileType(file),
                size: stats.size
            });
        }
    }

    private async walkDirectory(dir: string): Promise<string[]> {
        const files: string[] = [];
        
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                const subFiles = await this.walkDirectory(fullPath);
                files.push(...subFiles);
            } else {
                files.push(fullPath);
            }
        }
        
        return files;
    }

    private getFileType(filePath: string): 'css' | 'js' | 'image' | 'font' | 'other' {
        const ext = path.extname(filePath).toLowerCase();
        
        if (['.css', '.scss', '.sass', '.less'].includes(ext)) {
            return 'css';
        } else if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
            return 'js';
        } else if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico'].includes(ext)) {
            return 'image';
        } else if (['.woff', '.woff2', '.ttf', '.eot', '.otf'].includes(ext)) {
            return 'font';
        }
        
        return 'other';
    }

    private setupFileWatcher(): void {
        // Watch for changes in static directories
        const pattern = new vscode.RelativePattern(
            vscode.workspace.workspaceFolders?.[0] || '',
            '**/static/**/*'
        );
        
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
        
        this.fileWatcher.onDidCreate(async (uri) => {
            await this.handleFileChange(uri, 'create');
        });
        
        this.fileWatcher.onDidDelete(async (uri) => {
            await this.handleFileChange(uri, 'delete');
        });
        
        this.fileWatcher.onDidChange(async (uri) => {
            await this.handleFileChange(uri, 'change');
        });
    }

    private async handleFileChange(uri: vscode.Uri, changeType: 'create' | 'delete' | 'change'): Promise<void> {
        const filePath = uri.fsPath;
        
        if (changeType === 'delete') {
            this.staticFiles.delete(filePath);
        } else {
            // Find which static directory this file belongs to
            for (const dir of this.staticDirectories) {
                if (filePath.startsWith(dir.path)) {
                    const relativePath = path.relative(dir.path, filePath).replace(/\\/g, '/');
                    const stats = fs.statSync(filePath);
                    
                    this.staticFiles.set(filePath, {
                        relativePath,
                        absolutePath: filePath,
                        type: this.getFileType(filePath),
                        size: stats.size
                    });
                    break;
                }
            }
        }
    }

    public dispose(): void {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }
    }
}