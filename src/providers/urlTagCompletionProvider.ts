import * as vscode from 'vscode';
import { UrlPatternAnalyzer, UrlPattern } from '../analyzers/urlPatternAnalyzer';

export class UrlTagCompletionProvider implements vscode.CompletionItemProvider {
    constructor(private analyzer: UrlPatternAnalyzer) {}

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[]> {
        const line = document.lineAt(position).text;
        const linePrefix = line.substring(0, position.character);

        // Check if we're in a URL tag or reverse function context
        if (!this.isUrlContext(linePrefix, document.languageId)) {
            return [];
        }

        const urlPatterns = this.analyzer.getAllUrlPatterns();
        const completionItems: vscode.CompletionItem[] = [];

        for (const pattern of urlPatterns) {
            const item = this.createCompletionItem(pattern);
            completionItems.push(item);
        }

        return completionItems;
    }

    private isUrlContext(linePrefix: string, languageId: string): boolean {
        // Django template contexts
        if (languageId === 'django-html' || languageId === 'html') {
            // {% url 'name' %} or {% url "name" %}
            if (/\{%\s*url\s+['"]?$/.test(linePrefix)) {
                return true;
            }
            // <a href="{% url 'name' %}">
            if (/\{%\s*url\s+['"][^'"]*$/.test(linePrefix)) {
                return true;
            }
        }

        // Python contexts
        if (languageId === 'python') {
            // reverse('name') or reverse("name")
            if (/reverse\s*\(\s*['"]?$/.test(linePrefix)) {
                return true;
            }
            // reverse('name', ...) - continuing after the name
            if (/reverse\s*\(\s*['"][^'"]*$/.test(linePrefix)) {
                return true;
            }
            // redirect('name') in views
            if (/redirect\s*\(\s*['"]?$/.test(linePrefix)) {
                return true;
            }
        }

        return false;
    }

    private createCompletionItem(pattern: UrlPattern): vscode.CompletionItem {
        // Create the label with app_name prefix if applicable
        const label = pattern.appName ? `${pattern.appName}:${pattern.name}` : pattern.name;
        const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Value);

        // Set the actual text to insert
        item.insertText = label;

        // Add detail about the pattern
        item.detail = `URL: ${pattern.pattern}`;
        if (pattern.view) {
            item.detail += ` → ${pattern.view}`;
        }

        // Create documentation with parameter info
        let documentation = `URL pattern: \`${pattern.pattern}\`\n`;
        documentation += `File: ${pattern.filePath}\n`;
        
        if (pattern.params.length > 0) {
            documentation += `\nParameters:\n`;
            pattern.params.forEach(param => {
                documentation += `- ${param}\n`;
            });
            
            // Add usage example
            documentation += `\nUsage example:\n`;
            if (pattern.params.length === 1) {
                documentation += `\`\`\`django\n{% url '${label}' ${pattern.params[0]} %}\n\`\`\``;
            } else {
                const paramExample = pattern.params.map(p => p).join(' ');
                documentation += `\`\`\`django\n{% url '${label}' ${paramExample} %}\n\`\`\``;
            }
        }

        item.documentation = new vscode.MarkdownString(documentation);

        // Add sorting text to prioritize exact matches
        item.sortText = pattern.appName ? `1_${label}` : `0_${label}`;

        return item;
    }

    resolveCompletionItem?(
        item: vscode.CompletionItem,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.CompletionItem> {
        // Could provide additional information here if needed
        return item;
    }
}