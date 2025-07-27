import * as assert from 'assert';
import { PythonParser } from '../../parsers/pythonParser';

suite('PythonParser Unit Tests', () => {
    let parser: PythonParser;

    setup(() => {
        parser = new PythonParser();
    });

    test('should parse simple model class', async () => {
        const code = `
from django.db import models

class Post(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
`;
        
        const result = await parser.parseModelFile(code, 'blog/models.py');
        
        assert.strictEqual(result.models.length, 1);
        assert.strictEqual(result.models[0].name, 'Post');
        assert.strictEqual(result.models[0].fields.length, 2);
        assert.strictEqual(result.models[0].fields[0].name, 'title');
        assert.strictEqual(result.models[0].fields[0].type, 'CharField');
    });

    test('should handle custom managers', async () => {
        const code = `
from django.db import models

class PublishedManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(status='published')

class Post(models.Model):
    title = models.CharField(max_length=200)
    published = PublishedManager()
    objects = models.Manager()
`;
        
        const result = await parser.parseModelFile(code, 'blog/models.py');
        
        assert.strictEqual(result.models.length, 1);
        assert.strictEqual(result.models[0].managers.length, 2);
        assert.ok(result.models[0].managers.includes('published'));
        assert.ok(result.models[0].managers.includes('objects'));
    });

    test('should extract help text from fields', async () => {
        const code = `
from django.db import models

class Post(models.Model):
    title = models.CharField(max_length=200, help_text="Enter the post title")
`;
        
        const result = await parser.parseModelFile(code, 'blog/models.py');
        
        assert.strictEqual(result.models[0].fields[0].helpText, 'Enter the post title');
    });
});