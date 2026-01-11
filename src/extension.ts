// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const CURRENT_TARGET_KEY = 'currentTarget';
    const AUTO_SYNC_KEY = 'autoSyncEnabled';

    // Clear workspace state on activation (window restart/reload)
    context.workspaceState.update(CURRENT_TARGET_KEY, undefined);
    context.workspaceState.update(AUTO_SYNC_KEY, undefined);

    function getRemoteInfo(remoteTarget: string) {
        const match = remoteTarget.match(/^(.*?):(.*)$/);
        if (!match) { return null; }
        return { host: match[1], remotePath: match[2] };
    }

    function syncFile(document: vscode.TextDocument, remoteTarget: string, silent: boolean = false) {
        const localPath = document.uri.fsPath;
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        
        if (!workspaceFolder) {
            if (!silent) {
                vscode.window.showErrorMessage('Please run this command within an opened workspace folder');
            }
            return;
        }

        const workspaceName = path.basename(workspaceFolder.uri.fsPath);
        const relativePath = path.relative(workspaceFolder.uri.fsPath, localPath);
        
        // commnad
        const command = `rsync -avz --exclude '.DS_Store' "${localPath}" "${remoteTarget}/${workspaceName}/${relativePath}"`;

        if (!silent) {
            vscode.window.setStatusBarMessage(`Syncing to ${remoteTarget}: ${workspaceName}/${relativePath}...`);
        }
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                vscode.window.showErrorMessage(`Sync failed: ${stderr}`);
                console.error(error);
                return;
            }
            if (!silent) {
                vscode.window.setStatusBarMessage('');
            }
        });
    }

    function syncWorkspace(remoteTarget: string) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        // show present workspaceFolders for debugging
        console.log('Workspace Folders:', workspaceFolders);
        if (!workspaceFolders) { return; }

        workspaceFolders.forEach(folder => {
            const localPath = folder.uri.fsPath;
            const info = getRemoteInfo(remoteTarget);
            let command: string;

            if (info) {
                // not exist remote directory, create it first
                command = `ssh ${info.host} "mkdir -p '${info.remotePath}'" && rsync -avz --exclude '.DS_Store' "${localPath}" "${remoteTarget}/"`;
            } else {
                // ensure local directory exists
                command = `mkdir -p "${remoteTarget}" && rsync -avz --exclude '.DS_Store' "${localPath}" "${remoteTarget}/"`;
            }
            
            vscode.window.setStatusBarMessage(`Syncing workspace to ${remoteTarget}...`);
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    vscode.window.showErrorMessage(`Workspace sync failed: ${stderr}`);
                    console.error(error);
                } else {
                    vscode.window.showInformationMessage(`Workspace synced to ${remoteTarget}`);
                    vscode.window.setStatusBarMessage('');
                }
            });
        });
    }

    let syncDisposable = vscode.commands.registerCommand('simple-sync.sync', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        let remoteTarget = context.workspaceState.get<string>(CURRENT_TARGET_KEY);

        if (!remoteTarget) {
            const config = vscode.workspace.getConfiguration('simpleSync');
            const targets = config.get<string[]>('remoteTargets') || [];
            
            if (targets.length >= 1) {
                vscode.window.showErrorMessage('Please use "FileSync: Choose Remote Target" first.');
                return;
            } else {
                vscode.window.showErrorMessage('No remote targets configured. Please configure simpleSync.remoteTargets in settings.');
                return;
            }
        }

        syncFile(editor.document, remoteTarget);
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
            
            const autoSyncOptions = [
                { label: '$(sync) Enable Auto-sync', description: 'Automatically sync files on save', value: true },
                { label: '$(CircleSlash) Disable Auto-sync', description: 'Only sync manually', value: false }
            ];

            const selection = await vscode.window.showQuickPick(autoSyncOptions, {
                placeHolder: `Target set to ${selected}. Enable auto-sync?`,
                ignoreFocusOut: true
            });

            if (selection) {
                const isEnabled = selection.value;
                await context.workspaceState.update(AUTO_SYNC_KEY, isEnabled);
                
                if (isEnabled) {
                    syncWorkspace(selected);
                    vscode.window.showInformationMessage(`Auto-sync enabled for: ${selected}`);
                } else {
                    vscode.window.showInformationMessage('Auto-sync disabled');
                }
            }
        }
    });

    let onSaveDisposable = vscode.workspace.onDidSaveTextDocument((document) => {
        const autoSync = context.workspaceState.get<boolean>(AUTO_SYNC_KEY);
        const remoteTarget = context.workspaceState.get<string>(CURRENT_TARGET_KEY);
        
        if (autoSync && remoteTarget) {
            syncFile(document, remoteTarget);
        }
    });

    context.subscriptions.push(syncDisposable);
    context.subscriptions.push(chooseDisposable);
    context.subscriptions.push(onSaveDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
