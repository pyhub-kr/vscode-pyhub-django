import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Mock implementation of VS Code TextDocument
 */
export class MockTextDocument implements vscode.TextDocument {
    uri: vscode.Uri;
    fileName: string;
    isUntitled: boolean;
    languageId: string;
    version: number;
    isDirty: boolean;
    isClosed: boolean;
    eol: vscode.EndOfLine;
    lineCount: number;
    readonly encoding: string = 'utf8';
    
    private lines: string[];
    
    constructor(content: string, languageId: string = 'python', fileName: string = '/test/file.py') {
        this.uri = vscode.Uri.file(fileName);
        this.fileName = fileName;
        this.isUntitled = false;
        this.languageId = languageId;
        this.version = 1;
        this.isDirty = false;
        this.isClosed = false;
        this.eol = vscode.EndOfLine.LF;
        this.lines = content.split('\n');
        this.lineCount = this.lines.length;
    }
    
    save(): Thenable<boolean> {
        return Promise.resolve(true);
    }
    
    getText(range?: vscode.Range): string {
        if (!range) {
            return this.lines.join('\n');
        }
        
        // Handle range
        const startLine = range.start.line;
        const endLine = range.end.line;
        const startChar = range.start.character;
        const endChar = range.end.character;
        
        if (startLine === endLine) {
            return this.lines[startLine].substring(startChar, endChar);
        }
        
        const result: string[] = [];
        result.push(this.lines[startLine].substring(startChar));
        
        for (let i = startLine + 1; i < endLine; i++) {
            result.push(this.lines[i]);
        }
        
        result.push(this.lines[endLine].substring(0, endChar));
        return result.join('\n');
    }
    
    lineAt(lineOrPosition: number | vscode.Position): vscode.TextLine {
        const lineNumber = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
        const text = this.lines[lineNumber] || '';
        
        return {
            lineNumber,
            text,
            range: new vscode.Range(lineNumber, 0, lineNumber, text.length),
            rangeIncludingLineBreak: new vscode.Range(lineNumber, 0, lineNumber + 1, 0),
            firstNonWhitespaceCharacterIndex: text.length - text.trimStart().length,
            isEmptyOrWhitespace: text.trim().length === 0
        };
    }
    
    offsetAt(position: vscode.Position): number {
        let offset = 0;
        for (let i = 0; i < position.line; i++) {
            offset += this.lines[i].length + 1; // +1 for newline
        }
        offset += position.character;
        return offset;
    }
    
    positionAt(offset: number): vscode.Position {
        let remaining = offset;
        for (let line = 0; line < this.lines.length; line++) {
            const lineLength = this.lines[line].length + 1; // +1 for newline
            if (remaining < lineLength) {
                return new vscode.Position(line, remaining);
            }
            remaining -= lineLength;
        }
        return new vscode.Position(this.lines.length - 1, this.lines[this.lines.length - 1].length);
    }
    
    getWordRangeAtPosition(position: vscode.Position, regex?: RegExp): vscode.Range | undefined {
        const line = this.lines[position.line];
        if (!line) { return undefined; }
        
        const wordPattern = regex || /\w+/g;
        let match;
        
        while ((match = wordPattern.exec(line)) !== null) {
            const start = match.index;
            const end = start + match[0].length;
            
            if (start <= position.character && position.character <= end) {
                return new vscode.Range(
                    position.line, start,
                    position.line, end
                );
            }
        }
        
        return undefined;
    }
    
    validateRange(range: vscode.Range): vscode.Range {
        const start = this.validatePosition(range.start);
        const end = this.validatePosition(range.end);
        return new vscode.Range(start, end);
    }
    
    validatePosition(position: vscode.Position): vscode.Position {
        const line = Math.max(0, Math.min(position.line, this.lines.length - 1));
        const character = Math.max(0, Math.min(position.character, this.lines[line].length));
        return new vscode.Position(line, character);
    }
}

/**
 * Mock file system for testing
 */
export interface MockFileSystem {
    existsSync(path: string): boolean;
    readFileSync(path: string, encoding?: string): string;
    writeFileSync(path: string, data: string): void;
    mkdirSync(path: string, options?: any): void;
    readdirSync(path: string): string[];
    statSync(path: string): any;
}

export class InMemoryFileSystem implements MockFileSystem {
    private files: Map<string, string> = new Map();
    private directories: Set<string> = new Set();
    
    constructor(initialFiles?: { [path: string]: string }) {
        if (initialFiles) {
            for (const [filePath, content] of Object.entries(initialFiles)) {
                this.writeFileSync(filePath, content);
            }
        }
    }
    
    existsSync(filePath: string): boolean {
        return this.files.has(filePath) || this.directories.has(filePath);
    }
    
    readFileSync(filePath: string, encoding?: string): string {
        const content = this.files.get(filePath);
        if (!content) {
            throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
        }
        return content;
    }
    
    writeFileSync(filePath: string, data: string): void {
        // Ensure parent directories exist
        const dir = path.dirname(filePath);
        this.mkdirSync(dir, { recursive: true });
        this.files.set(filePath, data);
    }
    
    mkdirSync(dirPath: string, options?: any): void {
        if (options?.recursive) {
            const parts = dirPath.split(path.sep);
            let currentPath = '';
            for (const part of parts) {
                if (part) {
                    currentPath += (currentPath ? path.sep : '') + part;
                    this.directories.add(currentPath);
                }
            }
        } else {
            this.directories.add(dirPath);
        }
    }
    
    readdirSync(dirPath: string): string[] {
        if (!this.directories.has(dirPath)) {
            throw new Error(`ENOENT: no such file or directory, scandir '${dirPath}'`);
        }
        
        const items: string[] = [];
        const prefix = dirPath.endsWith(path.sep) ? dirPath : dirPath + path.sep;
        
        // Find all files and directories in this directory
        for (const filePath of this.files.keys()) {
            if (filePath.startsWith(prefix)) {
                const relative = filePath.substring(prefix.length);
                const firstSep = relative.indexOf(path.sep);
                if (firstSep === -1) {
                    items.push(relative);
                }
            }
        }
        
        for (const dir of this.directories) {
            if (dir.startsWith(prefix) && dir !== dirPath) {
                const relative = dir.substring(prefix.length);
                const firstSep = relative.indexOf(path.sep);
                if (firstSep === -1) {
                    items.push(relative);
                }
            }
        }
        
        return [...new Set(items)];
    }
    
    statSync(filePath: string): any {
        if (this.files.has(filePath)) {
            return {
                isFile: () => true,
                isDirectory: () => false,
                size: this.files.get(filePath)!.length
            };
        }
        if (this.directories.has(filePath)) {
            return {
                isFile: () => false,
                isDirectory: () => true,
                size: 0
            };
        }
        throw new Error(`ENOENT: no such file or directory, stat '${filePath}'`);
    }
}

/**
 * Create a mock VS Code extension
 */
export function createMockExtension(id: string, isActive: boolean = true): vscode.Extension<any> {
    return {
        id,
        extensionUri: vscode.Uri.file(`/test/extensions/${id}`),
        extensionPath: `/test/extensions/${id}`,
        isActive,
        packageJSON: {
            name: id,
            displayName: id,
            version: '1.0.0'
        },
        exports: {},
        activate: () => Promise.resolve({}),
        extensionKind: vscode.ExtensionKind.Workspace
    };
}

/**
 * Create a mock Python extension
 */
export function createMockPythonExtension(): vscode.Extension<any> {
    const mockExtension = createMockExtension('ms-python.python', true);
    const exports = {
        settings: {
            getExecutionDetails: (resource?: vscode.Uri) => {
                return {
                    execCommand: ['python', 'python3', '/usr/bin/python3']
                };
            }
        }
    };
    
    return {
        ...mockExtension,
        exports
    };
}

/**
 * Create a mock workspace folder
 */
export function createMockWorkspaceFolder(path: string, name?: string): vscode.WorkspaceFolder {
    return {
        uri: vscode.Uri.file(path),
        name: name || path.split('/').pop() || 'workspace',
        index: 0
    };
}