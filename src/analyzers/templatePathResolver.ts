import { injectable } from 'inversify';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

@injectable()
export class TemplatePathResolver {
    private templateDirs: string[] = [];
    private workspaceRoot: string;

    constructor() {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        this.scanTemplateDirs();
    }

    /**
     * Scan the workspace for template directories
     */
    private async scanTemplateDirs(): Promise<void> {
        if (!this.workspaceRoot) {
            return;
        }

        this.templateDirs = [];

        // Check for global templates directory
        const globalTemplatesDir = path.join(this.workspaceRoot, 'templates');
        if (fs.existsSync(globalTemplatesDir)) {
            this.templateDirs.push(globalTemplatesDir);
        }

        // Scan for app-specific template directories
        const files = await vscode.workspace.findFiles('**/templates/', '**/node_modules/**');
        for (const file of files) {
            const templateDir = file.fsPath;
            if (!this.templateDirs.includes(templateDir)) {
                this.templateDirs.push(templateDir);
            }
        }

        // Also check for Django apps with templates
        const appDirs = await vscode.workspace.findFiles('**/apps.py', '**/node_modules/**');
        for (const appFile of appDirs) {
            const appDir = path.dirname(appFile.fsPath);
            const appTemplatesDir = path.join(appDir, 'templates');
            if (fs.existsSync(appTemplatesDir) && !this.templateDirs.includes(appTemplatesDir)) {
                this.templateDirs.push(appTemplatesDir);
            }
        }
    }

    /**
     * Resolve a template path to an actual file path
     * @param templatePath The template path from render() function (e.g., "blog/post_list.html")
     * @returns The full file path or undefined if not found
     */
    public resolveTemplatePath(templatePath: string): string | undefined {
        // Remove quotes if present
        templatePath = templatePath.replace(/['"]/g, '');

        // Try each template directory
        for (const templateDir of this.templateDirs) {
            const fullPath = path.join(templateDir, templatePath);
            if (fs.existsSync(fullPath)) {
                return fullPath;
            }

            // Also try with app name prefix (Django convention)
            // e.g., "post_list.html" might be in "blog/templates/blog/post_list.html"
            const parts = templatePath.split('/');
            if (parts.length === 1) {
                // Get the app name from the template directory
                const dirParts = templateDir.split(path.sep);
                const templatesIndex = dirParts.lastIndexOf('templates');
                if (templatesIndex > 0) {
                    const appName = dirParts[templatesIndex - 1];
                    const appSpecificPath = path.join(templateDir, appName, templatePath);
                    if (fs.existsSync(appSpecificPath)) {
                        return appSpecificPath;
                    }
                }
            }
        }

        // Try relative to workspace root
        const workspacePath = path.join(this.workspaceRoot, templatePath);
        if (fs.existsSync(workspacePath)) {
            return workspacePath;
        }

        return undefined;
    }

    /**
     * Extract template path from a line of code
     * @param line The line of code containing render() call
     * @param position The position in the line
     * @returns The template path or undefined
     */
    public extractTemplatePathFromLine(line: string, position: number): string | undefined {
        // Common Django render patterns
        const patterns = [
            /render\s*\(\s*\w+\s*,\s*["']([^"']+)["']/,
            /render_to_response\s*\(\s*["']([^"']+)["']/,
            /TemplateResponse\s*\(\s*\w+\s*,\s*["']([^"']+)["']/,
            /get_template\s*\(\s*["']([^"']+)["']/,
            /select_template\s*\(\s*\[?\s*["']([^"']+)["']/
        ];

        for (const pattern of patterns) {
            const match = line.match(pattern);
            if (match && match[1]) {
                // Check if cursor is within the template string
                const templateStart = line.indexOf(match[1]);
                const templateEnd = templateStart + match[1].length;
                
                if (position >= templateStart - 1 && position <= templateEnd + 1) {
                    return match[1];
                }
            }
        }

        return undefined;
    }

    /**
     * Refresh template directories (e.g., when workspace changes)
     */
    public async refresh(): Promise<void> {
        await this.scanTemplateDirs();
    }

    /**
     * Get all template directories
     */
    public getTemplateDirs(): string[] {
        return [...this.templateDirs];
    }
}