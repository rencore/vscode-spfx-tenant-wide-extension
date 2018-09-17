'use strict';
import * as vscode from 'vscode';
import { addDeploymentInfo } from './command/addDeploymentInfo';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('rencoreSpfxGlobalExtension.addDeploymentInfo', (fileUri: vscode.Uri): void => {
    addDeploymentInfo(fileUri);
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {
}