import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { AdvancedModelAnalyzer } from '../../analyzers/advancedModelAnalyzer';
import { EnhancedCompletionProvider } from '../../providers/enhancedCompletionProvider';
import * as sinon from 'sinon';
import { MockTextDocument } from '../utils/mockHelpers';

suite('Advanced ORM Completion Test Suite', () => {
    let analyzer: AdvancedModelAnalyzer;
    let completionProvider: EnhancedCompletionProvider;
    let sandbox: sinon.SinonSandbox;

    // Helper to create mock documents
    function createMockDocument(text: string): vscode.TextDocument {
        return new MockTextDocument(text);
    }

    setup(() => {
        sandbox = sinon.createSandbox();
        analyzer = new AdvancedModelAnalyzer();
        completionProvider = new EnhancedCompletionProvider(analyzer);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('should provide manager methods for custom managers', async () => {
        const modelCode = `
from django.db import models

class PublishedManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_published=True)
    
    def by_author(self, author):
        return self.get_queryset().filter(author=author)

class Article(models.Model):
    title = models.CharField(max_length=200)
    is_published = models.BooleanField(default=False)
    
    objects = models.Manager()
    published = PublishedManager()
`;

        await analyzer.analyzeModelCode(modelCode, 'blog/models.py');
        
        const document = createMockDocument('articles = Article.published.');
        
        const position = new vscode.Position(0, 29);
        const completions = await completionProvider.provideCompletionItems(
            document, position, {} as any, {} as any
        );

        const methodNames = completions.map(item => item.label);
        
        console.log('Completion items:', methodNames);
        
        // Should include standard QuerySet methods
        assert.ok(methodNames.includes('all'));
        assert.ok(methodNames.includes('filter'));
        
        // Should include custom manager method
        assert.ok(methodNames.includes('by_author'));
    });

        test('should provide field lookups in filter/exclude methods', async () => {
        const modelCode = `
from django.db import models

class Author(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()

class Post(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey(Author, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    tags = models.ManyToManyField('Tag')
`;

        await analyzer.analyzeModelCode(modelCode, 'blog/models.py');
        
        const document = createMockDocument('posts = Post.objects.filter(');
        
        const position = new vscode.Position(0, 28);
        const completions = await completionProvider.provideCompletionItems(
            document, position, {} as any, {} as any
        );

        const fieldNames = completions.map(item => item.label);
        
        // Basic field lookups
        assert.ok(fieldNames.includes('title'));
        assert.ok(fieldNames.includes('title__icontains'));
        assert.ok(fieldNames.includes('title__startswith'));
        
        // ForeignKey lookups
        assert.ok(fieldNames.includes('author'));
        assert.ok(fieldNames.includes('author__name'));
        assert.ok(fieldNames.includes('author__email'));
        
        // DateTime lookups
        assert.ok(fieldNames.includes('created_at__year'));
        assert.ok(fieldNames.includes('created_at__month'));
        assert.ok(fieldNames.includes('created_at__gte'));
        
        // ManyToMany lookups
        assert.ok(fieldNames.includes('tags__in'));
    });

    test('should provide model method completions', async () => {
        const modelCode = `
from django.db import models

class Product(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    
    def get_discounted_price(self, discount_percent):
        return self.price * (1 - discount_percent / 100)
    
    def is_expensive(self):
        return self.price > 100
    
    @property
    def display_name(self):
        return f"{self.name} - $" + "{self.price}"
`;

        await analyzer.analyzeModelCode(modelCode, 'shop/models.py');
        
        const document = createMockDocument('product = Product.objects.first(); product.');
        
        const position = new vscode.Position(0, 43);
        const completions = await completionProvider.provideCompletionItems(
            document, position, {} as any, {} as any
        );

        const memberNames = completions.map(item => item.label);
        
        // Fields
        assert.ok(memberNames.includes('name'));
        assert.ok(memberNames.includes('price'));
        
        // Methods
        assert.ok(memberNames.includes('get_discounted_price'));
        assert.ok(memberNames.includes('is_expensive'));
        
        // Properties
        assert.ok(memberNames.includes('display_name'));
        
        // Django default methods
        assert.ok(memberNames.includes('save'));
        assert.ok(memberNames.includes('delete'));
    });

    test('should handle model inheritance correctly', async () => {
        const modelCode = `
from django.db import models

class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True
    
    def touch(self):
        self.save()

class Article(BaseModel):
    title = models.CharField(max_length=200)
    content = models.TextField()
    
    def publish(self):
        self.is_published = True
        self.save()
`;

        await analyzer.analyzeModelCode(modelCode, 'blog/models.py');
        
        const document = createMockDocument('article = Article(); article.');
        
        const position = new vscode.Position(0, 29);
        const completions = await completionProvider.provideCompletionItems(
            document, position, {} as any, {} as any
        );

        const memberNames = completions.map(item => item.label);
        
        // Inherited fields
        assert.ok(memberNames.includes('created_at'));
        assert.ok(memberNames.includes('updated_at'));
        
        // Inherited methods
        assert.ok(memberNames.includes('touch'));
        
        // Own fields and methods
        assert.ok(memberNames.includes('title'));
        assert.ok(memberNames.includes('content'));
        assert.ok(memberNames.includes('publish'));
    });

    test('should provide related model completions', async () => {
        const modelCode = `
from django.db import models

class Author(models.Model):
    name = models.CharField(max_length=100)
    bio = models.TextField()

class Book(models.Model):
    title = models.CharField(max_length=200)
    author = models.ForeignKey(Author, on_delete=models.CASCADE, related_name='books')
    
class Review(models.Model):
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField()
`;

        await analyzer.analyzeModelCode(modelCode, 'library/models.py');
        
        // Test forward relation
        let document = createMockDocument('book = Book.objects.first(); book.author.');
        
        let position = new vscode.Position(0, 42);
        let completions = await completionProvider.provideCompletionItems(
            document, position, {} as any, {} as any
        );

        let memberNames = completions.map(item => item.label);
        assert.ok(memberNames.includes('name'));
        assert.ok(memberNames.includes('bio'));
        
        // Test reverse relation
        document = createMockDocument('author = Author.objects.first(); author.books.');
        
        position = new vscode.Position(0, 47);
        completions = await completionProvider.provideCompletionItems(
            document, position, {} as any, {} as any
        );

        memberNames = completions.map(item => item.label);
        assert.ok(memberNames.includes('all'));
        assert.ok(memberNames.includes('filter'));
        assert.ok(memberNames.includes('create'));
    });

    test('should cache analysis results for performance', async () => {
        const modelCode = `
from django.db import models

class LargeModel(models.Model):
    ${Array.from({length: 50}, (_, i) => `field_${i} = models.CharField(max_length=100)`).join('\n    ')}
`;

        const startTime = Date.now();
        await analyzer.analyzeModelCode(modelCode, 'app/models.py');
        const firstAnalysisTime = Date.now() - startTime;

        // Second analysis should be much faster due to caching
        const secondStartTime = Date.now();
        await analyzer.analyzeModelCode(modelCode, 'app/models.py');
        const secondAnalysisTime = Date.now() - secondStartTime;

        assert.ok(secondAnalysisTime < firstAnalysisTime / 2, 
            `Cache should make second analysis faster. First: ${firstAnalysisTime}ms, Second: ${secondAnalysisTime}ms`);
    });

    test('should handle circular imports gracefully', async () => {
        const model1Code = `
from django.db import models
from app2.models import Model2

class Model1(models.Model):
    name = models.CharField(max_length=100)
    related = models.ForeignKey('app2.Model2', on_delete=models.CASCADE)
`;

        const model2Code = `
from django.db import models
from app1.models import Model1

class Model2(models.Model):
    title = models.CharField(max_length=100)
    related = models.ForeignKey('app1.Model1', on_delete=models.CASCADE)
`;

        // Should not throw or hang
        await analyzer.analyzeModelCode(model1Code, 'app1/models.py');
        await analyzer.analyzeModelCode(model2Code, 'app2/models.py');

        const models = analyzer.getAllModels();
        assert.ok('Model1' in models);
        assert.ok('Model2' in models);
    });

    test('should provide context-aware completions based on variable type', async () => {
        const modelCode = `
from django.db import models

class Task(models.Model):
    title = models.CharField(max_length=200)
    is_completed = models.BooleanField(default=False)
    
    @classmethod
    def get_pending(cls):
        return cls.objects.filter(is_completed=False)
`;

        await analyzer.analyzeModelCode(modelCode, 'todo/models.py');
        
        // Test variable type inference
        const lines = [
            'pending_tasks = Task.get_pending()',
            'pending_tasks.'
        ];
        const document = {
            lineAt: (line: number) => {
                const text = lines[line] || '';
                return {
                    text: text,
                    isEmptyOrWhitespace: text.trim().length === 0,
                    firstNonWhitespaceCharacterIndex: text.length - text.trimStart().length,
                    range: new vscode.Range(line, 0, line, text.length),
                    rangeIncludingLineBreak: new vscode.Range(line, 0, line, text.length)
                };
            },
            getText: () => lines.join('\n'),
            lineCount: lines.length
        } as any;
        
        const position = new vscode.Position(1, 14);
        const completions = await completionProvider.provideCompletionItems(
            document, position, {} as any, {} as any
        );

        const methodNames = completions.map(item => item.label);
        
        // Should provide QuerySet methods since get_pending returns a QuerySet
        assert.ok(methodNames.includes('filter'));
        assert.ok(methodNames.includes('exclude'));
        assert.ok(methodNames.includes('count'));
    });
});