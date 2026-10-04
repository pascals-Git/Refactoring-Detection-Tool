/* eslint-disable curly */
import * as vscode from 'vscode';
import { Project, SyntaxKind } from 'ts-morph';
import { TrackedEdit, EditAction } from '../tracker/EditTracker';
import { IRefactoringDetector, DetectionResult } from './IRefactoringDetector';

export class ExtractMethodDetector implements IRefactoringDetector {

    public analyze(history: TrackedEdit[], document: vscode.TextDocument, project: Project): DetectionResult | null {
        
        const recentCutIndex = history.map(a => a.action).lastIndexOf(EditAction.CutOrDelete);

        if (recentCutIndex === -1) return null;

        const editsAfterCut = history.slice(recentCutIndex + 1);
        
        const isTypingMethod = editsAfterCut.some(edit => 
            (edit.action === EditAction.Typing || edit.action === EditAction.Paste) &&
            edit.insertedText.includes('(')
        );
        if (!isTypingMethod) return null;
    
        // anlysing ast for current state of file
        const sourceFile = project.getSourceFile('temp.ts')!;
    
        // getting last edits of user
        const latestEdit = history[history.length -1];
        const lastChangeOffset = document.offsetAt(latestEdit.range.start);
    
        // getting all method calls in document
        const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    
        for (const callExpr of callExpressions) {
            const start = callExpr.getStart();
            const end = callExpr.getEnd();
    
            if (lastChangeOffset >= start && lastChangeOffset <= end+1) {
                const methodName = callExpr.getExpression().getText();
                
                // semantic check: method already existing or not
                const methodDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.MethodDeclaration);
                const functionDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration);
    
                const isDefinedLocally = [...methodDeclarations, ...functionDeclarations].some(decl => decl.getName() === methodName);
                
                if (!isDefinedLocally) {
                    return {
                        name: "Extract Method",
                        message: `Extracting method '${methodName}' automatically?`,
                        actionCommand: "editor.action.refactor" // calling command from vscode compiler api
                    };
                }                
            }
        }
        return null;
    }
}    