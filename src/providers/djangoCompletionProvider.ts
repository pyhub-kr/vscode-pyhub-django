import * as vscode from 'vscode';

/**
 * Django ORM 메서드 완성 항목
 */
const DJANGO_ORM_METHODS = [
    {
        label: 'all',
        detail: 'all()',
        documentation: '모든 객체를 반환하는 QuerySet을 가져옵니다.',
        insertText: 'all()'
    },
    {
        label: 'filter',
        detail: 'filter(**kwargs)',
        documentation: '주어진 조건에 맞는 객체들을 포함하는 QuerySet을 반환합니다.',
        insertText: new vscode.SnippetString('filter(${1:field}=${2:value})')
    },
    {
        label: 'exclude',
        detail: 'exclude(**kwargs)',
        documentation: '주어진 조건에 맞지 않는 객체들을 포함하는 QuerySet을 반환합니다.',
        insertText: new vscode.SnippetString('exclude(${1:field}=${2:value})')
    },
    {
        label: 'get',
        detail: 'get(**kwargs)',
        documentation: '주어진 조건에 맞는 단일 객체를 반환합니다.',
        insertText: new vscode.SnippetString('get(${1:field}=${2:value})')
    },
    {
        label: 'create',
        detail: 'create(**kwargs)',
        documentation: '새 객체를 생성하고 저장한 후 반환합니다.',
        insertText: new vscode.SnippetString('create(${1:field}=${2:value})')
    },
    {
        label: 'update',
        detail: 'update(**kwargs)',
        documentation: 'QuerySet의 모든 객체를 업데이트합니다.',
        insertText: new vscode.SnippetString('update(${1:field}=${2:value})')
    },
    {
        label: 'delete',
        detail: 'delete()',
        documentation: 'QuerySet의 모든 객체를 삭제합니다.',
        insertText: 'delete()'
    },
    {
        label: 'count',
        detail: 'count()',
        documentation: 'QuerySet의 객체 수를 반환합니다.',
        insertText: 'count()'
    },
    {
        label: 'exists',
        detail: 'exists()',
        documentation: 'QuerySet에 객체가 있는지 확인합니다.',
        insertText: 'exists()'
    },
    {
        label: 'order_by',
        detail: 'order_by(*fields)',
        documentation: '지정된 필드로 정렬된 QuerySet을 반환합니다.',
        insertText: new vscode.SnippetString('order_by(${1:\'-created_at\'})')
    },
    {
        label: 'distinct',
        detail: 'distinct()',
        documentation: '중복을 제거한 QuerySet을 반환합니다.',
        insertText: 'distinct()'
    },
    {
        label: 'values',
        detail: 'values(*fields)',
        documentation: '딕셔너리 형태의 QuerySet을 반환합니다.',
        insertText: new vscode.SnippetString('values(${1:\'field\'})')
    },
    {
        label: 'values_list',
        detail: 'values_list(*fields)',
        documentation: '튜플 형태의 QuerySet을 반환합니다.',
        insertText: new vscode.SnippetString('values_list(${1:\'field\'}, flat=True)')
    },
    {
        label: 'select_related',
        detail: 'select_related(*fields)',
        documentation: 'ForeignKey 관계를 미리 가져와 쿼리 최적화를 수행합니다.',
        insertText: new vscode.SnippetString('select_related(${1:\'field\'})')
    },
    {
        label: 'prefetch_related',
        detail: 'prefetch_related(*fields)',
        documentation: 'ManyToMany 관계를 미리 가져와 쿼리 최적화를 수행합니다.',
        insertText: new vscode.SnippetString('prefetch_related(${1:\'field\'})')
    }
];

export class DjangoCompletionProvider implements vscode.CompletionItemProvider {
    
    public provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        
        const line = document.lineAt(position).text;
        const linePrefix = line.substring(0, position.character);
        
        // Django ORM 패턴 감지: Model.objects.
        if (this.isDjangoORMPattern(linePrefix)) {
            return this.getDjangoORMCompletions();
        }
        
        // Django 모델 필드 패턴 감지
        if (this.isDjangoModelFieldPattern(linePrefix)) {
            return this.getDjangoFieldCompletions();
        }
        
        return [];
    }
    
    private isDjangoORMPattern(linePrefix: string): boolean {
        // 패턴: SomeModel.objects. 또는 Model.objects.
        const ormPattern = /\b\w+\.objects\.$/;
        return ormPattern.test(linePrefix);
    }
    
    private isDjangoModelFieldPattern(linePrefix: string): boolean {
        // 패턴: models.
        const fieldPattern = /\bmodels\.$/;
        return fieldPattern.test(linePrefix);
    }
    
    private getDjangoORMCompletions(): vscode.CompletionItem[] {
        return DJANGO_ORM_METHODS.map(method => {
            const item = new vscode.CompletionItem(
                method.label,
                vscode.CompletionItemKind.Method
            );
            
            item.detail = method.detail;
            item.documentation = new vscode.MarkdownString(method.documentation);
            item.insertText = method.insertText;
            
            // Django 항목을 상위에 표시
            item.sortText = '0' + method.label;
            
            return item;
        });
    }
    
    private getDjangoFieldCompletions(): vscode.CompletionItem[] {
        const fields = [
            {
                label: 'CharField',
                detail: 'CharField(max_length)',
                documentation: '짧은 문자열 필드',
                insertText: new vscode.SnippetString('CharField(max_length=${1:255})')
            },
            {
                label: 'TextField',
                detail: 'TextField()',
                documentation: '긴 텍스트 필드',
                insertText: 'TextField()'
            },
            {
                label: 'IntegerField',
                detail: 'IntegerField()',
                documentation: '정수 필드',
                insertText: 'IntegerField()'
            },
            {
                label: 'BooleanField',
                detail: 'BooleanField()',
                documentation: '불린 필드',
                insertText: new vscode.SnippetString('BooleanField(default=${1:False})')
            },
            {
                label: 'DateTimeField',
                detail: 'DateTimeField()',
                documentation: '날짜와 시간 필드',
                insertText: new vscode.SnippetString('DateTimeField(${1:auto_now_add=True})')
            },
            {
                label: 'ForeignKey',
                detail: 'ForeignKey(to, on_delete)',
                documentation: '다대일 관계 필드',
                insertText: new vscode.SnippetString('ForeignKey(${1:Model}, on_delete=models.${2:CASCADE})')
            },
            {
                label: 'ManyToManyField',
                detail: 'ManyToManyField(to)',
                documentation: '다대다 관계 필드',
                insertText: new vscode.SnippetString('ManyToManyField(${1:Model})')
            }
        ];
        
        return fields.map(field => {
            const item = new vscode.CompletionItem(
                field.label,
                vscode.CompletionItemKind.Class
            );
            
            item.detail = field.detail;
            item.documentation = new vscode.MarkdownString(field.documentation);
            item.insertText = field.insertText;
            item.sortText = '0' + field.label;
            
            return item;
        });
    }
}