/* eslint-disable curly */
import * as vscode from 'vscode';
import { Project, SyntaxKind } from 'ts-morph';
import { TrackedEdit, EditAction } from '../tracker/EditTracker';
import { IRefactoringDetector, DetectionResult } from './IRefactoringDetector';

export class InlineVariableDetector implements IRefactoringDetector {

    public analyze(history: TrackedEdit[], document: vscode.TextDocument, project: Project): DetectionResult | null {
        if (history.length === 0) return null;

        const lastEdit = history[history.length -1];

        // checking matching heuristc
        if (![EditAction.Paste, EditAction.Overwrite, EditAction.Typing].includes(lastEdit.action)) {
            return null;
        }

        const replacedText = lastEdit.deletedText?.trim();

        if (!replacedText || !this.isValidIdentifier(replacedText)) {
            return null;
        }

        const insertedText = lastEdit.insertedText.trim();
        if (!insertedText) return null;
        
        const sourceFile = project.getSourceFile('temp.ts');

        // searching in ast for variable declaration 
        const variableDeclarations = sourceFile?.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
        const targetVar = variableDeclarations?.find(v => v.getName() === replacedText);

        if (!targetVar) return null;

        // "extracting" right part of variable 
        const initializer = targetVar.getInitializer();
        if (!initializer) return null;

        const initializerText = initializer.getText().trim();

        // checking what user typed
        if (insertedText === initializerText) {
            // checking if cut or paste
            const recentCutIndex = history.map(a => a.action).lastIndexOf(EditAction.CutOrDelete);
            const didCutBefore = recentCutIndex !== 1;

            const extraMessage = didCutBefore
                ? "Value got cut out before."
                : "";

                return {
                    name: "Inline Variable",
                    message: `Automatically inline '${replacedText}' and delete declaration in the whole file?`,
                    actionCommand: "editor.action.refactor"
                };
        }
        return null;
    }

    // checking via regex if variablename is valid
    private isValidIdentifier(name: string): boolean {
        return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
    }
}