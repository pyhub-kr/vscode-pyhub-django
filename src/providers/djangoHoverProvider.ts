import * as vscode from 'vscode';

/**
 * Django 필드 타입 문서
 */
const DJANGO_FIELD_DOCS: { [key: string]: string } = {
    'CharField': `**CharField**
    
짧은 문자열을 저장하는 필드입니다.

**필수 인자:**
- \`max_length\`: 최대 문자 길이

**예제:**
\`\`\`python
name = models.CharField(max_length=100)
title = models.CharField(max_length=200, blank=True)
\`\`\``,

    'TextField': `**TextField**
    
긴 텍스트를 저장하는 필드입니다.

**예제:**
\`\`\`python
description = models.TextField()
content = models.TextField(blank=True, null=True)
\`\`\``,

    'IntegerField': `**IntegerField**
    
정수를 저장하는 필드입니다.

**예제:**
\`\`\`python
age = models.IntegerField()
quantity = models.IntegerField(default=0)
\`\`\``,

    'BooleanField': `**BooleanField**
    
True/False 값을 저장하는 필드입니다.

**예제:**
\`\`\`python
is_active = models.BooleanField(default=True)
is_published = models.BooleanField(default=False)
\`\`\``,

    'DateTimeField': `**DateTimeField**
    
날짜와 시간을 저장하는 필드입니다.

**주요 옵션:**
- \`auto_now\`: 객체가 저장될 때마다 자동으로 현재 시간 설정
- \`auto_now_add\`: 객체가 처음 생성될 때만 현재 시간 설정

**예제:**
\`\`\`python
created_at = models.DateTimeField(auto_now_add=True)
updated_at = models.DateTimeField(auto_now=True)
\`\`\``,

    'ForeignKey': `**ForeignKey**
    
다대일(Many-to-One) 관계를 정의하는 필드입니다.

**필수 인자:**
- \`to\`: 관계를 맺을 모델
- \`on_delete\`: 참조된 객체가 삭제될 때의 동작

**on_delete 옵션:**
- \`CASCADE\`: 참조된 객체와 함께 삭제
- \`PROTECT\`: 삭제 방지
- \`SET_NULL\`: NULL로 설정
- \`SET_DEFAULT\`: 기본값으로 설정

**예제:**
\`\`\`python
author = models.ForeignKey(User, on_delete=models.CASCADE)
category = models.ForeignKey('Category', on_delete=models.SET_NULL, null=True)
\`\`\``,

    'ManyToManyField': `**ManyToManyField**
    
다대다(Many-to-Many) 관계를 정의하는 필드입니다.

**예제:**
\`\`\`python
tags = models.ManyToManyField(Tag)
users = models.ManyToManyField(User, related_name='liked_posts')
\`\`\``
};

export class DjangoHoverProvider implements vscode.HoverProvider {
    
    public provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        
        const range = document.getWordRangeAtPosition(position);
        if (!range) {
            return null;
        }
        
        const word = document.getText(range);
        
        // Django 필드 타입에 대한 hover 정보 제공
        if (DJANGO_FIELD_DOCS[word]) {
            const markdown = new vscode.MarkdownString(DJANGO_FIELD_DOCS[word]);
            markdown.isTrusted = true;
            return new vscode.Hover(markdown, range);
        }
        
        // Django ORM 메서드에 대한 hover 정보
        const ormMethods = this.getORMMethodDocs();
        if (ormMethods[word]) {
            const markdown = new vscode.MarkdownString(ormMethods[word]);
            markdown.isTrusted = true;
            return new vscode.Hover(markdown, range);
        }
        
        return null;
    }
    
    private getORMMethodDocs(): { [key: string]: string } {
        return {
            'objects': `**objects**
            
Django 모델의 기본 매니저입니다.

**사용 예제:**
\`\`\`python
# 모든 객체 가져오기
all_posts = Post.objects.all()

# 필터링
published_posts = Post.objects.filter(status='published')

# 단일 객체 가져오기
post = Post.objects.get(id=1)
\`\`\``,

            'filter': `**filter(**kwargs)**
            
주어진 조건에 맞는 객체들을 포함하는 새로운 QuerySet을 반환합니다.

**예제:**
\`\`\`python
# 단일 조건
posts = Post.objects.filter(status='published')

# 여러 조건 (AND)
posts = Post.objects.filter(status='published', author=user)

# 조건 연산자
posts = Post.objects.filter(created_at__gte=date)
posts = Post.objects.filter(title__contains='Django')
\`\`\``,

            'get': `**get(**kwargs)**
            
주어진 조건에 맞는 단일 객체를 반환합니다.

**주의사항:**
- 객체가 없으면 \`DoesNotExist\` 예외 발생
- 여러 객체가 있으면 \`MultipleObjectsReturned\` 예외 발생

**예제:**
\`\`\`python
try:
    post = Post.objects.get(id=1)
except Post.DoesNotExist:
    # 객체가 없을 때 처리
    pass
\`\`\``
        };
    }
}