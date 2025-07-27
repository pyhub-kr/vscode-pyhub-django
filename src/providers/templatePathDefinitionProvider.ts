import { injectable, inject } from 'inversify';
import * as vscode from 'vscode';
import { TemplatePathResolver } from '../analyzers/templatePathResolver';
import { TYPES } from '../container/types';

@injectable()
export class TemplatePathDefinitionProvider implements vscode.DefinitionProvider {
    constructor(
        @inject(TYPES.TemplatePathResolver) private templateResolver: TemplatePathResolver
    ) {}

    async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Definition | undefined> {
        const line = document.lineAt(position).text;
        const charPosition = position.character;

        // Extract template path from the current line
        const templatePath = this.templateResolver.extractTemplatePathFromLine(line, charPosition);
        if (!templatePath) {
            return undefined;
        }

        // Resolve the template path to an actual file
        const resolvedPath = this.templateResolver.resolveTemplatePath(templatePath);
        if (!resolvedPath) {
            return undefined;
        }

        // Return the location of the template file
        const uri = vscode.Uri.file(resolvedPath);
        return new vscode.Location(uri, new vscode.Position(0, 0));
    }
}