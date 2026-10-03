/* eslint-disable curly */
import { Project, SyntaxKind } from 'ts-morph';
import { DetectionResult, IRefactoringDetector } from './IRefactoringDetector';
import { TextDocument } from 'vscode';
import { TrackedEdit } from '../tracker/EditTracker';

export class RenameVariableDetector implements IRefactoringDetector {
    analyze(history: TrackedEdit[], document: TextDocument, project: Project): DetectionResult | null {
        if (history.length < 1) return null;
        const lastEdit = history[history.length - 1];

        if ( lastEdit.action !== 'Typing' && lastEdit.action !== 'Overwrite') return null;

        const sourceFile = project.getSourceFile('temp.ts');
        const offset = document.offsetAt(lastEdit.range.start);
        // finding where the user is typing
        const node = sourceFile?.getDescendantAtPos(offset);

        if (node && node.getKind() === SyntaxKind.Identifier) {
            const parent = node.getParent();

            // check if identifier is part of the variable declaration
            if (parent && parent.getKind() === SyntaxKind.VariableDeclaration) {
                // if true run command                
                return {
                    name: "Rename Variable",
                    message: `Rename the variable '${node.getText()}' in the whole project?`,
                    actionCommand: "editor.action.rename"
                };
            }
        }
        return null;
    }
}