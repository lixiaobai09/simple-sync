// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const CURRENT_TARGET_KEY = 'currentTarget';

    let syncDisposable = vscode.commands.registerCommand('simple-sync.sync', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        // 1. Get the absolute path of the local file
        const localPath = editor.document.uri.fsPath;
        
        // 2. Get the path relative to the workspace (file_path)
        const relativePath = vscode.workspace.asRelativePath(editor.document.uri);
        
        if (relativePath === localPath) {
            vscode.window.showErrorMessage('Please run this command within an opened workspace folder');
            return;
        }

        // 3. Get the remote target
        let remoteTarget = context.workspaceState.get<string>(CURRENT_TARGET_KEY);

        if (!remoteTarget) {
            const config = vscode.workspace.getConfiguration('simpleSync');
            const targets = config.get<string[]>('remoteTargets') || [];
            
            if (targets.length === 1) {
                remoteTarget = targets[0];
            } else if (targets.length > 1) {
                vscode.window.showErrorMessage('Multiple remote targets configured. Please use "FileSync: Choose Remote Target" first.');
                return;
            } else {
                vscode.window.showErrorMessage('No remote targets configured. Please configure simpleSync.remoteTargets in settings.');
                return;
            }
        }

        // 4. Construct the full remote path (server:repo_path/file_path)
        const fullRemotePath = `${remoteTarget}/${relativePath}`;

        // 5. Execute the rsync command
        const command = `rsync -avz "${localPath}" "${fullRemotePath}"`;

        vscode.window.setStatusBarMessage(`Syncing to ${remoteTarget}: ${relativePath}...`);
        exec(command, (error, stdout, stderr) => {
            if (error) {
                vscode.window.showErrorMessage(`Sync failed: ${stderr}`);
                console.error(error);
                return;
            }
            vscode.window.setStatusBarMessage('');
        });
    });

    let chooseDisposable = vscode.commands.registerCommand('simple-sync.chooseTarget', async () => {
        const config = vscode.workspace.getConfiguration('simpleSync');
        const targets = config.get<string[]>('remoteTargets') || [];

        if (targets.length === 0) {
            vscode.window.showErrorMessage('No remote targets configured in settings.');
            return;
        }

        const selected = await vscode.window.showQuickPick(targets, {
            placeHolder: 'Select a remote target for sync'
        });

        if (selected) {
            await context.workspaceState.update(CURRENT_TARGET_KEY, selected);
            vscode.window.showInformationMessage(`Remote target set to: ${selected}`);
        }
    });

    context.subscriptions.push(syncDisposable);
    context.subscriptions.push(chooseDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
