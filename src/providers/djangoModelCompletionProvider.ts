import { injectable, inject } from 'inversify';
import * as vscode from 'vscode';
import { DjangoProjectAnalyzer } from '../analyzers/djangoProjectAnalyzer';
import { TYPES } from '../container/types';

@injectable()
export class DjangoModelCompletionProvider implements vscode.CompletionItemProvider {
    constructor(
        @inject(TYPES.DjangoProjectAnalyzer) private analyzer: DjangoProjectAnalyzer
    ) {}

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[]> {
        const linePrefix = document.lineAt(position).text.substring(0, position.character);
        
        // Django ORM 메서드 감지
        if (this.isQuerySetContext(linePrefix)) {
            return this.getQuerySetCompletions();
        }
        
        // 모델 필드 접근 감지
        if (this.isModelFieldContext(linePrefix)) {
            return this.getModelFieldCompletions(linePrefix);
        }
        
        // 모델 클래스 import 감지
        if (this.isModelImportContext(linePrefix)) {
            return this.getModelClassCompletions();
        }

        return [];
    }

    private isQuerySetContext(linePrefix: string): boolean {
        // 패턴: Model.objects. 또는 queryset.
        const patterns = [
            /\w+\.objects\.$/,
            /queryset\.$/,
            /\.filter\([^)]*\)\.$/,
            /\.exclude\([^)]*\)\.$/,
            /\.annotate\([^)]*\)\.$/
        ];
        
        return patterns.some(pattern => pattern.test(linePrefix));
    }

    private isModelFieldContext(linePrefix: string): boolean {
        // 패턴: model_instance. 또는 Model.field
        const patterns = [
            /\w+\.__$/,
            /self\.$/,
            /instance\.$/
        ];
        
        return patterns.some(pattern => pattern.test(linePrefix));
    }

    private isModelImportContext(linePrefix: string): boolean {
        // 패턴: from app.models import
        return /from\s+[\w.]+models\s+import\s+$/.test(linePrefix);
    }

    private getQuerySetCompletions(): vscode.CompletionItem[] {
        const methods = [
            // 쿼리셋 메서드
            { name: 'all', detail: '() -> QuerySet', doc: 'Returns a copy of the current QuerySet' },
            { name: 'filter', detail: '(**kwargs) -> QuerySet', doc: 'Returns a new QuerySet containing objects that match the given lookup parameters' },
            { name: 'exclude', detail: '(**kwargs) -> QuerySet', doc: 'Returns a new QuerySet containing objects that do not match the given lookup parameters' },
            { name: 'get', detail: '(**kwargs) -> Model', doc: 'Returns the object matching the given lookup parameters' },
            { name: 'first', detail: '() -> Model | None', doc: 'Returns the first object matched by the queryset' },
            { name: 'last', detail: '() -> Model | None', doc: 'Returns the last object matched by the queryset' },
            { name: 'exists', detail: '() -> bool', doc: 'Returns True if the QuerySet contains any results' },
            { name: 'count', detail: '() -> int', doc: 'Returns an integer representing the number of objects in the QuerySet' },
            { name: 'order_by', detail: '(*fields) -> QuerySet', doc: 'Returns a QuerySet ordered by the given fields' },
            { name: 'distinct', detail: '(*fields) -> QuerySet', doc: 'Returns a new QuerySet that uses SELECT DISTINCT' },
            { name: 'values', detail: '(*fields) -> QuerySet', doc: 'Returns a QuerySet that returns dictionaries' },
            { name: 'values_list', detail: '(*fields, flat=False) -> QuerySet', doc: 'Returns a QuerySet that returns tuples' },
            { name: 'select_related', detail: '(*fields) -> QuerySet', doc: 'Returns a QuerySet that will follow foreign-key relationships' },
            { name: 'prefetch_related', detail: '(*lookups) -> QuerySet', doc: 'Returns a QuerySet that will automatically retrieve related objects' },
            { name: 'annotate', detail: '(**kwargs) -> QuerySet', doc: 'Returns a QuerySet where each object has been annotated with the specified values' },
            { name: 'aggregate', detail: '(**kwargs) -> dict', doc: 'Returns a dictionary of aggregate values' },
            { name: 'create', detail: '(**kwargs) -> Model', doc: 'Creates an object and saves it all in one step' },
            { name: 'get_or_create', detail: '(**kwargs) -> (Model, bool)', doc: 'Returns a tuple of (object, created)' },
            { name: 'update_or_create', detail: '(defaults=None, **kwargs) -> (Model, bool)', doc: 'Updates an object with the given kwargs, creating a new one if necessary' },
            { name: 'bulk_create', detail: '(objs, batch_size=None) -> list', doc: 'Inserts the provided list of objects into the database' },
            { name: 'bulk_update', detail: '(objs, fields, batch_size=None)', doc: 'Updates the given fields on the provided model instances' },
            { name: 'delete', detail: '() -> (int, dict)', doc: 'Deletes the objects in the current QuerySet' },
            { name: 'update', detail: '(**kwargs) -> int', doc: 'Updates all objects in the QuerySet' },
        ];

        return methods.map(method => {
            const item = new vscode.CompletionItem(method.name, vscode.CompletionItemKind.Method);
            item.detail = method.detail;
            item.documentation = new vscode.MarkdownString(method.doc);
            item.insertText = new vscode.SnippetString(`${method.name}($0)`);
            return item;
        });
    }

    private async getModelFieldCompletions(linePrefix: string): Promise<vscode.CompletionItem[]> {
        // 실제 구현에서는 analyzer를 통해 모델 필드를 가져옴
        const modelInfo = await this.analyzer.getModelInfo();
        
        // 현재 컨텍스트에서 모델 이름 추출
        const modelName = this.extractModelName(linePrefix);
        if (!modelName || !modelInfo[modelName]) {
            return [];
        }

        const fields = modelInfo[modelName].fields;
        return fields.map(field => {
            const item = new vscode.CompletionItem(field.name, vscode.CompletionItemKind.Field);
            item.detail = field.type;
            item.documentation = new vscode.MarkdownString(`**Type:** ${field.type}\n\n${field.helpText || ''}`);
            return item;
        });
    }

    private async getModelClassCompletions(): Promise<vscode.CompletionItem[]> {
        const modelInfo = await this.analyzer.getModelInfo();
        
        return Object.keys(modelInfo).map(modelName => {
            const item = new vscode.CompletionItem(modelName, vscode.CompletionItemKind.Class);
            item.detail = `Django Model`;
            item.documentation = new vscode.MarkdownString(`Import ${modelName} model`);
            return item;
        });
    }

    private extractModelName(linePrefix: string): string | undefined {
        // 간단한 패턴 매칭으로 모델 이름 추출
        const match = linePrefix.match(/(\w+)\.\w*$/);
        return match ? match[1] : undefined;
    }
}

// Django 필드 타입 자동 완성을 위한 헬퍼
@injectable()
export class DjangoFieldCompletionProvider implements vscode.CompletionItemProvider {
    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[]> {
        const linePrefix = document.lineAt(position).text.substring(0, position.character);
        
        // models. 다음에 필드 타입 제안
        if (/models\.$/.test(linePrefix)) {
            return this.getFieldTypeCompletions();
        }

        return [];
    }

    private getFieldTypeCompletions(): vscode.CompletionItem[] {
        const fieldTypes = [
            { name: 'CharField', snippet: 'CharField(max_length=${1:255})', doc: 'A string field, for small- to large-sized strings' },
            { name: 'TextField', snippet: 'TextField()', doc: 'A large text field' },
            { name: 'IntegerField', snippet: 'IntegerField()', doc: 'An integer field' },
            { name: 'FloatField', snippet: 'FloatField()', doc: 'A floating-point number field' },
            { name: 'DecimalField', snippet: 'DecimalField(max_digits=${1:10}, decimal_places=${2:2})', doc: 'A fixed-precision decimal number' },
            { name: 'BooleanField', snippet: 'BooleanField(default=${1:False})', doc: 'A true/false field' },
            { name: 'DateField', snippet: 'DateField()', doc: 'A date field' },
            { name: 'DateTimeField', snippet: 'DateTimeField(auto_now_add=${1:True})', doc: 'A date and time field' },
            { name: 'EmailField', snippet: 'EmailField()', doc: 'An email address field' },
            { name: 'URLField', snippet: 'URLField()', doc: 'A URL field' },
            { name: 'ForeignKey', snippet: 'ForeignKey(${1:Model}, on_delete=models.${2:CASCADE})', doc: 'A many-to-one relationship' },
            { name: 'ManyToManyField', snippet: 'ManyToManyField(${1:Model})', doc: 'A many-to-many relationship' },
            { name: 'OneToOneField', snippet: 'OneToOneField(${1:Model}, on_delete=models.${2:CASCADE})', doc: 'A one-to-one relationship' },
            { name: 'FileField', snippet: 'FileField(upload_to="${1:uploads/}")', doc: 'A file upload field' },
            { name: 'ImageField', snippet: 'ImageField(upload_to="${1:images/}")', doc: 'An image upload field' },
            { name: 'JSONField', snippet: 'JSONField(default=${1:dict})', doc: 'A field for storing JSON data' },
            { name: 'UUIDField', snippet: 'UUIDField(default=uuid.uuid4)', doc: 'A field for storing universally unique identifiers' },
        ];

        return fieldTypes.map(field => {
            const item = new vscode.CompletionItem(field.name, vscode.CompletionItemKind.Class);
            item.insertText = new vscode.SnippetString(field.snippet);
            item.documentation = new vscode.MarkdownString(field.doc);
            item.detail = 'Django Model Field';
            return item;
        });
    }
}