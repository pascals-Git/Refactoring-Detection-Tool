/* eslint-disable curly */
import * as vscode from 'vscode';
import { Project, SyntaxKind} from 'ts-morph';
import { TrackedEdit, EditAction } from '../tracker/EditTracker';
import { IRefactoringDetector, DetectionResult } from './IRefactoringDetector';

export class ReplaceMagicLiteral implements IRefactoringDetector {

    public analyze(history: TrackedEdit[], document: vscode.TextDocument, project: Project): DetectionResult | null {
        if (history.length === 0) return null;

        const lastEdit = history[history.length - 1];

        // literal deleted:
        let deletedText = "";

        if (lastEdit.action === EditAction.Overwrite) {
            deletedText = lastEdit.deletedText?.trim() || "";
        }
        else if (lastEdit.action === EditAction.Typing || lastEdit.action === EditAction.Paste) {
            // while user typing checking if something was cut or delete
            const cutEdit = [...history].reverse().find(a => a.action === EditAction.CutOrDelete);
            if (cutEdit && cutEdit.deletedText) {
                deletedText = cutEdit.deletedText.trim();
            }
        }

        if (!deletedText) return null;

        // checking if literal is number or string
        const isNumeric = !isNaN(Number(deletedText)) && deletedText.length > 0;
        const isString = /^["'`].*["'`]$/.test(deletedText);

        if (!isNumeric && !isString) return null;

        // checking ast
        const sourceFile = project.getSourceFile('temp.ts')!;
        const lastChangeOffset = document.offsetAt(lastEdit.range.start);
        const currentNode = sourceFile?.getDescendantAtPos(lastChangeOffset); // tracking position of cursor

        if (!currentNode) return null;

        // if literal replaced by identifier 
        if (currentNode.getKind() === SyntaxKind.Identifier) {
            const newIdentifierName = currentNode.getText();

            // waiting with the popup for better ux
            if (newIdentifierName.length < 2) return null;

            const declarations = [
                ...sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration),
                ...sourceFile.getDescendantsOfKind(SyntaxKind.Parameter)
            ];

            const isDeclared = declarations.some(decl => decl.getName() === newIdentifierName);

            if (!isDeclared) {
                return {
                    name: "Replac Magic Literal",
                    message: `Extract '${deletedText}' as constant '${newIdentifierName}' ?`,
                    actionCommand: "editor.action.refactor"
                };
            }
        }
        return null;
    }
}