import * as vscode from 'vscode';
import { DjangoCompletionProvider, DjangoHoverProvider } from './providers';

let isDjangoProject = false;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Django Power Tools is now active!');

    // Python Extension 확인 및 활성화
    const pythonExtension = await checkPythonExtension();
    if (!pythonExtension) {
        return;
    }

    // Django 프로젝트 감지
    isDjangoProject = await detectDjangoProject();
    if (isDjangoProject) {
        await activateDjangoFeatures(context);
    }

    // 워크스페이스 변경 감지
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(async () => {
            isDjangoProject = await detectDjangoProject();
            if (isDjangoProject) {
                await activateDjangoFeatures(context);
            }
        })
    );

    // 테스트 명령어
    let disposable = vscode.commands.registerCommand('django-power-tools.helloWorld', () => {
        vscode.window.showInformationMessage('Django Power Tools가 활성화되었습니다!');
    });

    context.subscriptions.push(disposable);
}

/**
 * Python Extension 확인 및 활성화
 */
async function checkPythonExtension(): Promise<vscode.Extension<any> | undefined> {
    const pythonExt = vscode.extensions.getExtension('ms-python.python');
    
    if (!pythonExt) {
        const selection = await vscode.window.showErrorMessage(
            'Django Power Tools는 Python 확장이 필요합니다.',
            '설치하기'
        );
        
        if (selection === '설치하기') {
            await vscode.commands.executeCommand('workbench.extensions.installExtension', 'ms-python.python');
        }
        return undefined;
    }

    if (!pythonExt.isActive) {
        await pythonExt.activate();
    }

    return pythonExt;
}

/**
 * Django 프로젝트 감지
 */
async function detectDjangoProject(): Promise<boolean> {
    const managePyFiles = await vscode.workspace.findFiles('**/manage.py', '**/node_modules/**', 5);
    
    if (managePyFiles.length > 0) {
        console.log('Django 프로젝트 감지됨:', managePyFiles[0].fsPath);
        return true;
    }
    
    return false;
}

/**
 * Django 기능 활성화
 */
async function activateDjangoFeatures(context: vscode.ExtensionContext) {
    console.log('Django 기능 활성화 중...');

    // Python 경로 자동 설정
    await configurePythonPaths();

    // Django Completion Provider 등록
    const completionProvider = vscode.languages.registerCompletionItemProvider(
        'python',
        new DjangoCompletionProvider(),
        '.', ' '
    );
    context.subscriptions.push(completionProvider);

    // Django Hover Provider 등록
    const hoverProvider = vscode.languages.registerHoverProvider(
        'python',
        new DjangoHoverProvider()
    );
    context.subscriptions.push(hoverProvider);

    // Django 명령어 등록
    registerDjangoCommands(context);

    vscode.window.showInformationMessage('Django Power Tools가 Django 프로젝트를 감지했습니다!');
}

/**
 * Python 경로 자동 설정
 */
async function configurePythonPaths() {
    const managePyFiles = await vscode.workspace.findFiles('**/manage.py', '**/node_modules/**', 1);
    
    if (managePyFiles.length === 0) {
        return;
    }

    const managePyPath = managePyFiles[0];
    const projectRoot = vscode.workspace.asRelativePath(managePyPath.fsPath)
        .replace(/[\\\/]manage\.py$/, '');

    const config = vscode.workspace.getConfiguration('python');
    const extraPaths = config.get<string[]>('analysis.extraPaths') || [];

    if (!extraPaths.includes(projectRoot)) {
        // 사용자에게 확인
        const selection = await vscode.window.showInformationMessage(
            `Django 프로젝트 루트를 Python 경로에 추가하시겠습니까? (${projectRoot})`,
            '예',
            '아니오'
        );

        if (selection === '예') {
            extraPaths.push(projectRoot);
            await config.update(
                'analysis.extraPaths',
                extraPaths,
                vscode.ConfigurationTarget.Workspace
            );
            
            vscode.window.showInformationMessage('Python 경로가 성공적으로 업데이트되었습니다.');
        }
    }
}

/**
 * Django 명령어 등록
 */
function registerDjangoCommands(context: vscode.ExtensionContext) {
    // runserver 명령어
    const runServerCmd = vscode.commands.registerCommand('django-power-tools.runServer', async () => {
        const terminal = vscode.window.createTerminal('Django Server');
        terminal.sendText('python manage.py runserver');
        terminal.show();
    });
    context.subscriptions.push(runServerCmd);

    // makemigrations 명령어
    const makeMigrationsCmd = vscode.commands.registerCommand('django-power-tools.makeMigrations', async () => {
        const terminal = vscode.window.createTerminal('Django Migrations');
        terminal.sendText('python manage.py makemigrations');
        terminal.show();
    });
    context.subscriptions.push(makeMigrationsCmd);

    // migrate 명령어
    const migrateCmd = vscode.commands.registerCommand('django-power-tools.migrate', async () => {
        const terminal = vscode.window.createTerminal('Django Migrate');
        terminal.sendText('python manage.py migrate');
        terminal.show();
    });
    context.subscriptions.push(migrateCmd);
}

export function deactivate() {
    console.log('Django Power Tools is deactivated');
}