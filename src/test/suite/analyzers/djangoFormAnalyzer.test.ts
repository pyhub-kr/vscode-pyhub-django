import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { DjangoFormAnalyzer, FormFieldInfo } from '../../../analyzers/djangoFormAnalyzer';

suite('DjangoFormAnalyzer Test Suite', () => {
    let analyzer: DjangoFormAnalyzer;
    let tempDir: string;

    setup(() => {
        // Create a mock project analyzer
        const mockProjectAnalyzer = {
            getModelInfo: async () => ({})
        } as any;
        
        analyzer = new DjangoFormAnalyzer(mockProjectAnalyzer);
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'django-form-analyzer-test-'));
    });

    teardown(() => {
        // Clean up temp directory
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    test('should analyze basic Django Form', async () => {
        const formContent = `
from django import forms

class ContactForm(forms.Form):
    name = forms.CharField(max_length=100)
    email = forms.EmailField()
    message = forms.TextField()
    subscribe = forms.BooleanField(required=False)
`;
        
        const filePath = path.join(tempDir, 'forms.py');
        fs.writeFileSync(filePath, formContent);

        await analyzer.analyzeFormFile(filePath);
        const forms = analyzer.getAllForms();

        assert.strictEqual(forms.length, 1);
        
        const contactForm = forms[0];
        assert.strictEqual(contactForm.name, 'ContactForm');
        assert.strictEqual(contactForm.type, 'Form');
        assert.strictEqual(contactForm.fields.length, 4);
        
        // Check fields
        const nameField = contactForm.fields.find((f: any) => f.name === 'name');
        assert.ok(nameField);
        assert.strictEqual(nameField.fieldType, 'CharField');
        
        const emailField = contactForm.fields.find((f: any) => f.name === 'email');
        assert.ok(emailField);
        assert.strictEqual(emailField.fieldType, 'EmailField');
        
        const messageField = contactForm.fields.find((f: any) => f.name === 'message');
        assert.ok(messageField);
        assert.strictEqual(messageField.fieldType, 'TextField');
        
        const subscribeField = contactForm.fields.find((f: any) => f.name === 'subscribe');
        assert.ok(subscribeField);
        assert.strictEqual(subscribeField.fieldType, 'BooleanField');
    });

    test('should analyze ModelForm', async () => {
        const formContent = `
from django import forms
from .models import User

class UserForm(forms.ModelForm):
    extra_field = forms.CharField()
    
    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name']
`;
        
        const filePath = path.join(tempDir, 'forms.py');
        fs.writeFileSync(filePath, formContent);

        await analyzer.analyzeFormFile(filePath);
        const forms = analyzer.getAllForms();

        assert.strictEqual(forms.length, 1);
        
        const userForm = forms[0];
        assert.strictEqual(userForm.name, 'UserForm');
        assert.strictEqual(userForm.type, 'ModelForm');
        assert.strictEqual(userForm.modelName, 'User');
        assert.strictEqual(userForm.fields.length, 1); // Only explicitly declared fields
        
        const extraField = userForm.fields[0];
        assert.strictEqual(extraField.name, 'extra_field');
        assert.strictEqual(extraField.fieldType, 'CharField');
    });

    test('should handle multiple forms in one file', async () => {
        const formContent = `
from django import forms

class LoginForm(forms.Form):
    username = forms.CharField()
    password = forms.CharField(widget=forms.PasswordInput)

class RegisterForm(forms.Form):
    username = forms.CharField()
    email = forms.EmailField()
    password1 = forms.CharField(widget=forms.PasswordInput)
    password2 = forms.CharField(widget=forms.PasswordInput)
    
class ProfileForm(forms.ModelForm):
    bio = forms.TextField()
    
    class Meta:
        model = Profile
        fields = ['bio', 'avatar']
`;
        
        const filePath = path.join(tempDir, 'forms.py');
        fs.writeFileSync(filePath, formContent);

        await analyzer.analyzeFormFile(filePath);
        const forms = analyzer.getAllForms();

        assert.strictEqual(forms.length, 3);
        
        // Check form names
        const formNames = forms.map((f: any) => f.name);
        assert.ok(formNames.includes('LoginForm'));
        assert.ok(formNames.includes('RegisterForm'));
        assert.ok(formNames.includes('ProfileForm'));
        
        // Check LoginForm
        const loginForm = forms.find((f: any) => f.name === 'LoginForm');
        assert.ok(loginForm);
        assert.strictEqual(loginForm.type, 'Form');
        assert.strictEqual(loginForm.fields.length, 2);
        
        // Check RegisterForm
        const registerForm = forms.find((f: any) => f.name === 'RegisterForm');
        assert.ok(registerForm);
        assert.strictEqual(registerForm.type, 'Form');
        assert.strictEqual(registerForm.fields.length, 4);
        
        // Check ProfileForm
        const profileForm = forms.find((f: any) => f.name === 'ProfileForm');
        assert.ok(profileForm);
        assert.strictEqual(profileForm.type, 'ModelForm');
        assert.strictEqual(profileForm.modelName, 'Profile');
    });

    test('should ignore non-form classes', async () => {
        const formContent = `
from django import forms

class NotAForm:
    def __init__(self):
        pass

class MyForm(forms.Form):
    name = forms.CharField()

class MyHelper:
    @staticmethod
    def process():
        pass
`;
        
        const filePath = path.join(tempDir, 'forms.py');
        fs.writeFileSync(filePath, formContent);

        await analyzer.analyzeFormFile(filePath);
        const forms = analyzer.getAllForms();

        assert.strictEqual(forms.length, 1);
        assert.strictEqual(forms[0].name, 'MyForm');
    });

    test('should handle workspace scanning', async () => {
        // Create multiple form files
        const appDir = path.join(tempDir, 'myapp');
        fs.mkdirSync(appDir);
        
        const form1Content = `
from django import forms

class Form1(forms.Form):
    field1 = forms.CharField()
`;
        fs.writeFileSync(path.join(appDir, 'forms.py'), form1Content);
        
        const form2Content = `
from django import forms

class Form2(forms.Form):
    field2 = forms.EmailField()
`;
        fs.writeFileSync(path.join(tempDir, 'forms.py'), form2Content);

        // Mock workspace folders
        const originalFolders = vscode.workspace.workspaceFolders;
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
            value: [{ uri: vscode.Uri.file(tempDir) }],
            configurable: true
        });

        // Mock findFiles
        const originalFindFiles = vscode.workspace.findFiles;
        vscode.workspace.findFiles = async (include: vscode.GlobPattern) => {
            return [
                vscode.Uri.file(path.join(appDir, 'forms.py')),
                vscode.Uri.file(path.join(tempDir, 'forms.py'))
            ];
        };

        try {
            await analyzer.scanWorkspace();
            const forms = analyzer.getAllForms();
            
            assert.strictEqual(forms.length, 2);
            const formNames = forms.map((f: any) => f.name);
            assert.ok(formNames.includes('Form1'));
            assert.ok(formNames.includes('Form2'));
        } finally {
            // Restore original values
            Object.defineProperty(vscode.workspace, 'workspaceFolders', {
                value: originalFolders,
                configurable: true
            });
            vscode.workspace.findFiles = originalFindFiles;
        }
    });

    test('should get forms by file path', async () => {
        const form1Content = `
from django import forms

class Form1(forms.Form):
    field1 = forms.CharField()
    
class Form2(forms.Form):
    field2 = forms.EmailField()
`;
        const form2Content = `
from django import forms

class Form3(forms.Form):
    field3 = forms.IntegerField()
`;
        
        const file1Path = path.join(tempDir, 'forms1.py');
        const file2Path = path.join(tempDir, 'forms2.py');
        
        fs.writeFileSync(file1Path, form1Content);
        fs.writeFileSync(file2Path, form2Content);

        await analyzer.analyzeFormFile(file1Path);
        await analyzer.analyzeFormFile(file2Path);

        // Get forms from first file
        const forms1 = analyzer.getAllForms().filter(f => f.filePath === file1Path);
        assert.strictEqual(forms1.length, 2);
        assert.ok(forms1.some((f: any) => f.name === 'Form1'));
        assert.ok(forms1.some((f: any) => f.name === 'Form2'));

        // Get forms from second file
        const forms2 = analyzer.getAllForms().filter(f => f.filePath === file2Path);
        assert.strictEqual(forms2.length, 1);
        assert.strictEqual(forms2[0].name, 'Form3');
    });

    test('should get form by name', async () => {
        const formContent = `
from django import forms

class ContactForm(forms.Form):
    name = forms.CharField()
    
class ProfileForm(forms.ModelForm):
    bio = forms.TextField()
    
    class Meta:
        model = Profile
        fields = ['bio']
`;
        
        const filePath = path.join(tempDir, 'forms.py');
        fs.writeFileSync(filePath, formContent);

        await analyzer.analyzeFormFile(filePath);

        const contactForm = analyzer.getForm('ContactForm');
        assert.ok(contactForm);
        assert.strictEqual(contactForm.name, 'ContactForm');
        assert.strictEqual(contactForm.type, 'Form');

        const profileForm = analyzer.getForm('ProfileForm');
        assert.ok(profileForm);
        assert.strictEqual(profileForm.name, 'ProfileForm');
        assert.strictEqual(profileForm.type, 'ModelForm');

        const nonExistent = analyzer.getForm('NonExistentForm');
        assert.strictEqual(nonExistent, undefined);
    });

    test('should handle complex field types', async () => {
        const formContent = `
from django import forms
from django.forms import ModelChoiceField, ModelMultipleChoiceField

class ComplexForm(forms.Form):
    choice = forms.ChoiceField(choices=CHOICES)
    multi_choice = forms.MultipleChoiceField(choices=CHOICES)
    typed_choice = forms.TypedChoiceField(choices=CHOICES, coerce=int)
    model_choice = ModelChoiceField(queryset=Model.objects.all())
    model_multi = ModelMultipleChoiceField(queryset=Model.objects.all())
    file_field = forms.FileField()
    image_field = forms.ImageField()
    regex_field = forms.RegexField(regex=r'^[0-9]+$')
`;
        
        const filePath = path.join(tempDir, 'forms.py');
        fs.writeFileSync(filePath, formContent);

        await analyzer.analyzeFormFile(filePath);
        const forms = analyzer.getAllForms();

        assert.strictEqual(forms.length, 1);
        const form = forms[0];
        assert.strictEqual(form.fields.length, 8);

        // Check that all field types are captured correctly
        const fieldTypes = form.fields.map((f: FormFieldInfo) => f.fieldType);
        assert.ok(fieldTypes.includes('ChoiceField'));
        assert.ok(fieldTypes.includes('MultipleChoiceField'));
        assert.ok(fieldTypes.includes('TypedChoiceField'));
        assert.ok(fieldTypes.includes('ModelChoiceField'));
        assert.ok(fieldTypes.includes('ModelMultipleChoiceField'));
        assert.ok(fieldTypes.includes('FileField'));
        assert.ok(fieldTypes.includes('ImageField'));
        assert.ok(fieldTypes.includes('RegexField'));
    });

    test('should clear forms', async () => {
        const formContent = `
from django import forms

class TestForm(forms.Form):
    field = forms.CharField()
`;
        
        const filePath = path.join(tempDir, 'forms.py');
        fs.writeFileSync(filePath, formContent);

        await analyzer.analyzeFormFile(filePath);
        assert.strictEqual(analyzer.getAllForms().length, 1);

        analyzer.dispose();
        // Create a mock project analyzer
        const mockProjectAnalyzer = {
            getModelInfo: async () => ({})
        } as any;
        
        analyzer = new DjangoFormAnalyzer(mockProjectAnalyzer);
        assert.strictEqual(analyzer.getAllForms().length, 0);
    });
});