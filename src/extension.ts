/* eslint-disable curly */
import * as vscode from 'vscode';
import { EditTracker } from './tracker/EditTracker';
import { DetectorManager } from './detectors/DetectorManager'; 
import { DetectionResult } from './detectors/IRefactoringDetector';


export function activate(context: vscode.ExtensionContext) {
  console.log('Refactoring-Detection active');

  const editTracker = new EditTracker();
  const detectorManager = new DetectorManager();

  // saving the whole selection before any editings
  let selectionListener = vscode.window.onDidChangeTextEditorSelection(event => {    
    editTracker.updateLastSelection(event.textEditor);
  });

  let changeListener = vscode.workspace.onDidChangeTextDocument(event => {
    if (event.document.uri.scheme !== 'file') return;

    // saving any changes
    editTracker.recordEdit(event);

    // analysing with ts-morph
    const detectionResult = detectorManager.checkForRefactoring(editTracker.getHistory(), event.document); 

    if (detectionResult) {
      promptUserForAutmatedRefactoring(detectionResult, editTracker, event.document);
    }
    
  });  

  context.subscriptions.push(selectionListener, changeListener);

  // activation with shortcuts
  let commandListener = vscode.commands.registerCommand('Refactoring-Detection-Tool.triggerRefactoring', () => {
    vscode.window.showInformationMessage('Shortcut pressed!');
  });
  context.subscriptions.push(commandListener);
}

async function promptUserForAutmatedRefactoring(result: DetectionResult, tracker: EditTracker, document: vscode.TextDocument) {
  const selection = await vscode.window.showInformationMessage(
    result.message,
    'Yes', 'No'
  );

  if (selection === 'Yes') {
    // calculating offsets for the revert
    await tracker.revertTrackedChanges(document);

    // executes the command of the refactoring
    vscode.commands.executeCommand(result.actionCommand);

    tracker.clearHistory();
  }
  else if (selection === 'No') {
    tracker.clearHistory();
  }  
}

export function deactivate() {}