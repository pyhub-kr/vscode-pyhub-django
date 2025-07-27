import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { TemplatePathResolver } from '../../analyzers/templatePathResolver';

suite('TemplatePathResolver Test Suite', () => {
    let resolver: TemplatePathResolver;

    setup(() => {
        resolver = new TemplatePathResolver();
    });

    test('should extract template path from render call', () => {
        const line = '    return render(request, "blog/post_list.html", context)';
        const charPosition = 30; // Position inside the template string
        
        const result = resolver.extractTemplatePathFromLine(line, charPosition);
        
        assert.strictEqual(result, 'blog/post_list.html');
    });

    test('should extract template path with single quotes', () => {
        const line = "    return render(request, 'blog/detail.html', {'post': post})";
        const charPosition = 30;
        
        const result = resolver.extractTemplatePathFromLine(line, charPosition);
        
        assert.strictEqual(result, 'blog/detail.html');
    });

    test('should return undefined when cursor not on template path', () => {
        const line = '    return render(request, "blog/post_list.html", context)';
        const charPosition = 10; // Position on 'render'
        
        const result = resolver.extractTemplatePathFromLine(line, charPosition);
        
        assert.strictEqual(result, undefined);
    });

    test('should handle template path with spaces in render call', () => {
        const line = '    return render( request , "app/template.html" , context )';
        const charPosition = 35;
        
        const result = resolver.extractTemplatePathFromLine(line, charPosition);
        
        assert.strictEqual(result, 'app/template.html');
    });

    test('should return undefined for malformed render calls', () => {
        const line = '    return render(request)';
        const charPosition = 15;
        
        const result = resolver.extractTemplatePathFromLine(line, charPosition);
        
        assert.strictEqual(result, undefined);
    });
});