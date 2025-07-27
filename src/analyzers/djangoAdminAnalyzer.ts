import { injectable, inject } from 'inversify';
import * as vscode from 'vscode';
import * as path from 'path';
import { TYPES } from '../container/types';
import { PythonParser } from '../parsers/pythonParser';
import { DjangoProjectAnalyzer } from './djangoProjectAnalyzer';

export interface DjangoModel {
    name: string;
    appName: string;
    fields: Map<string, { name: string; type: string; }>;
    methods: string[];
    filePath: string;
    line: number;
}

export interface AdminClass {
    name: string;
    modelName: string;
    model?: DjangoModel;
    filePath: string;
    line: number;
    attributes: Map<string, any>;
    methods: string[];
    inlines: string[];
    isRegistered: boolean;
}

export interface AdminInline {
    name: string;
    modelName: string;
    type: 'TabularInline' | 'StackedInline';
    filePath: string;
    line: number;
}

@injectable()
export class DjangoAdminAnalyzer {
    private adminClasses: Map<string, AdminClass> = new Map();
    private adminInlines: Map<string, AdminInline> = new Map();
    private fileAdminMap: Map<string, string[]> = new Map();
    
    // Common ModelAdmin attributes
    private readonly ADMIN_ATTRIBUTES = [
        'list_display', 'list_display_links', 'list_filter', 'list_select_related',
        'list_per_page', 'list_max_show_all', 'list_editable', 'search_fields',
        'search_help_text', 'date_hierarchy', 'save_as', 'save_as_continue',
        'save_on_top', 'paginator', 'preserve_filters', 'inlines', 'actions',
        'actions_on_top', 'actions_on_bottom', 'actions_selection_counter',
        'fields', 'exclude', 'fieldsets', 'form', 'filter_horizontal',
        'filter_vertical', 'ordering', 'view_on_site', 'show_full_result_count',
        'sortable_by', 'readonly_fields', 'raw_id_fields', 'formfield_overrides',
        'prepopulated_fields', 'radio_fields', 'autocomplete_fields'
    ];
    
    // Common ModelAdmin methods
    private readonly ADMIN_METHODS = [
        'get_queryset', 'get_list_display', 'get_list_display_links',
        'get_fields', 'get_fieldsets', 'get_list_filter', 'get_list_select_related',
        'get_search_fields', 'get_search_results', 'get_sortable_by',
        'get_ordering', 'get_readonly_fields', 'get_prepopulated_fields',
        'get_form', 'get_formsets_with_inlines', 'get_inline_instances',
        'formfield_for_foreignkey', 'formfield_for_manytomany', 'formfield_for_choice_field',
        'get_changelist', 'get_changelist_form', 'get_changelist_formset',
        'has_add_permission', 'has_change_permission', 'has_delete_permission',
        'has_view_permission', 'has_module_permission',
        'save_model', 'delete_model', 'save_formset', 'save_related',
        'get_autocomplete_fields', 'get_actions', 'get_urls',
        'add_view', 'change_view', 'delete_view', 'history_view', 'changelist_view'
    ];
    
    // Inline attributes
    private readonly INLINE_ATTRIBUTES = [
        'model', 'fk_name', 'formset', 'form', 'classes', 'extra', 'min_num',
        'max_num', 'validate_min', 'validate_max', 'fields', 'exclude',
        'raw_id_fields', 'verbose_name', 'verbose_name_plural', 'can_delete',
        'show_change_link', 'autocomplete_fields', 'readonly_fields'
    ];

    constructor(
        @inject(TYPES.ExtensionContext) private context: vscode.ExtensionContext,
        @inject(TYPES.PythonParser) private pythonParser: PythonParser,
        @inject(TYPES.DjangoProjectAnalyzer) private projectAnalyzer: DjangoProjectAnalyzer
    ) {}

    async analyzeAdminFile(content: string, filePath: string): Promise<void> {
        // Clear previous admin classes from this file
        const previousClasses = this.fileAdminMap.get(filePath) || [];
        previousClasses.forEach(className => {
            this.adminClasses.delete(className);
        });
        this.fileAdminMap.set(filePath, []);

        // Parse file content
        const lines = content.split('\n');
        const adminClassNames: string[] = [];

        // Find admin class definitions
        const adminClassRegex = /class\s+(\w+)\s*\(\s*(admin\.)?ModelAdmin\s*\)/;
        const inlineRegex = /class\s+(\w+)\s*\(\s*(admin\.)?(TabularInline|StackedInline)\s*\)/;
        const registerRegex = /@admin\.register\s*\(\s*(\w+)\s*\)/;
        const modelRegex = /^\s*model\s*=\s*(\w+)\s*$/;

        let currentClass: AdminClass | null = null;
        let currentInline: AdminInline | null = null;
        let indentLevel = 0;
        let nextClassModel: string | null = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Check for @admin.register decorator
            const registerMatch = line.match(registerRegex);
            if (registerMatch) {
                nextClassModel = registerMatch[1];
                continue;
            }

            // Check for ModelAdmin class
            const adminMatch = line.match(adminClassRegex);
            if (adminMatch) {
                const className = adminMatch[1];
                currentClass = {
                    name: className,
                    modelName: nextClassModel || '',
                    filePath,
                    line: i,
                    attributes: new Map(),
                    methods: [],
                    inlines: [],
                    isRegistered: nextClassModel !== null
                };
                
                this.adminClasses.set(className, currentClass);
                adminClassNames.push(className);
                nextClassModel = null;
                indentLevel = this.getIndentLevel(line);
                continue;
            }

            // Check for Inline class
            const inlineMatch = line.match(inlineRegex);
            if (inlineMatch) {
                const inlineName = inlineMatch[1];
                const inlineType = inlineMatch[3] as 'TabularInline' | 'StackedInline';
                currentInline = {
                    name: inlineName,
                    modelName: '',
                    type: inlineType,
                    filePath,
                    line: i
                };
                
                this.adminInlines.set(inlineName, currentInline);
                currentClass = null;
                indentLevel = this.getIndentLevel(line);
                continue;
            }

            // Parse class content
            if (currentClass && this.getIndentLevel(line) > indentLevel && trimmedLine) {
                // Check for model assignment in Meta class
                if (trimmedLine.startsWith('model =')) {
                    const modelMatch = trimmedLine.match(/model\s*=\s*(\w+)/);
                    if (modelMatch) {
                        currentClass.modelName = modelMatch[1];
                    }
                }

                // Check for attributes
                for (const attr of this.ADMIN_ATTRIBUTES) {
                    if (trimmedLine.startsWith(`${attr} =`) || trimmedLine.startsWith(`${attr}=`)) {
                        const value = this.parseAttributeValue(trimmedLine, attr);
                        currentClass.attributes.set(attr, value);
                        break;
                    }
                }

                // Check for methods
                const methodMatch = trimmedLine.match(/def\s+(\w+)\s*\(/);
                if (methodMatch) {
                    currentClass.methods.push(methodMatch[1]);
                }

                // Check for inlines
                if (trimmedLine.startsWith('inlines =')) {
                    const inlineList = this.parseListAttribute(trimmedLine);
                    currentClass.inlines = inlineList;
                }
            }

            // Parse inline content
            if (currentInline && this.getIndentLevel(line) > indentLevel && trimmedLine) {
                if (trimmedLine.startsWith('model =')) {
                    const modelMatch = trimmedLine.match(/model\s*=\s*(\w+)/);
                    if (modelMatch) {
                        currentInline.modelName = modelMatch[1];
                    }
                }
            }

            // Reset current class/inline if dedented
            if (trimmedLine && this.getIndentLevel(line) <= indentLevel) {
                currentClass = null;
                currentInline = null;
            }
        }

        // Find admin.site.register() calls
        const siteRegisterRegex = /admin\.site\.register\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g;
        let match;
        while ((match = siteRegisterRegex.exec(content)) !== null) {
            const modelName = match[1];
            const adminClassName = match[2];
            const adminClass = this.adminClasses.get(adminClassName);
            if (adminClass) {
                adminClass.modelName = modelName;
                adminClass.isRegistered = true;
            }
        }

        // Link models to admin classes
        await this.linkModelsToAdminClasses();

        this.fileAdminMap.set(filePath, adminClassNames);
    }

    private async linkModelsToAdminClasses(): Promise<void> {
        // Get models from advanced analyzer
        const advancedAnalyzer = this.projectAnalyzer.getAdvancedAnalyzer();
        if (!advancedAnalyzer) {
            return;
        }
        
        const models = advancedAnalyzer.getModels();
        
        for (const [className, adminClass] of this.adminClasses) {
            if (adminClass.modelName) {
                // Find the corresponding model
                const model = models.get(adminClass.modelName);
                if (model) {
                    // Convert to DjangoModel format
                    adminClass.model = {
                        name: model.name,
                        appName: model.app,
                        fields: new Map(model.fields.map(f => [f.name, { name: f.name, type: f.type }])),
                        methods: model.methods.map(m => m.name),
                        filePath: '',
                        line: 0
                    };
                }
            }
        }
    }

    private getIndentLevel(line: string): number {
        const match = line.match(/^(\s*)/);
        return match ? match[1].length : 0;
    }

    private parseAttributeValue(line: string, attribute: string): any {
        const valueStart = line.indexOf('=') + 1;
        const value = line.substring(valueStart).trim();
        
        // Parse list values
        if (value.startsWith('[')) {
            return this.parseListValue(value);
        }
        
        // Parse tuple values
        if (value.startsWith('(')) {
            return this.parseTupleValue(value);
        }
        
        // Parse string values
        if (value.startsWith("'") || value.startsWith('"')) {
            return value.slice(1, -1);
        }
        
        // Parse boolean/numeric values
        if (value === 'True' || value === 'False') {
            return value === 'True';
        }
        
        if (!isNaN(Number(value))) {
            return Number(value);
        }
        
        return value;
    }

    private parseListAttribute(line: string): string[] {
        const match = line.match(/\[(.*?)\]/);
        if (match) {
            return match[1]
                .split(',')
                .map(item => item.trim())
                .filter(item => item.length > 0)
                .map(item => item.replace(/['"]/g, ''));
        }
        return [];
    }

    private parseListValue(value: string): string[] {
        // Simple list parsing - can be enhanced for nested structures
        const match = value.match(/\[(.*?)\]/);
        if (match) {
            return match[1]
                .split(',')
                .map(item => item.trim())
                .filter(item => item.length > 0)
                .map(item => item.replace(/['"]/g, ''));
        }
        return [];
    }

    private parseTupleValue(value: string): any[] {
        // Simple tuple parsing
        const match = value.match(/\((.*?)\)/);
        if (match) {
            return match[1]
                .split(',')
                .map(item => item.trim())
                .filter(item => item.length > 0)
                .map(item => item.replace(/['"]/g, ''));
        }
        return [];
    }

    async scanWorkspace(): Promise<void> {
        const adminFiles = await vscode.workspace.findFiles('**/admin.py', '**/node_modules/**');
        
        for (const file of adminFiles) {
            try {
                const document = await vscode.workspace.openTextDocument(file);
                await this.analyzeAdminFile(document.getText(), file.fsPath);
            } catch (error) {
                console.error(`Error analyzing admin file ${file.fsPath}:`, error);
            }
        }
    }

    getAdminClasses(): Map<string, AdminClass> {
        return this.adminClasses;
    }

    getAdminClass(name: string): AdminClass | undefined {
        return this.adminClasses.get(name);
    }

    getAdminClassForModel(modelName: string): AdminClass | undefined {
        for (const [_, adminClass] of this.adminClasses) {
            if (adminClass.modelName === modelName) {
                return adminClass;
            }
        }
        return undefined;
    }

    getAdminInlines(): Map<string, AdminInline> {
        return this.adminInlines;
    }

    getAdminAttributes(): string[] {
        return this.ADMIN_ATTRIBUTES;
    }

    getAdminMethods(): string[] {
        return this.ADMIN_METHODS;
    }

    getInlineAttributes(): string[] {
        return this.INLINE_ATTRIBUTES;
    }
}