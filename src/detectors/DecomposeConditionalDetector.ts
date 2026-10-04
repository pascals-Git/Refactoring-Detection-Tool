/* eslint-disable curly */
import * as vscode from 'vscode';
import { Project, SyntaxKind } from 'ts-morph';
import { TrackedEdit, EditAction } from '../tracker/EditTracker';
import { IRefactoringDetector, DetectionResult } from './IRefactoringDetector';

export class DecomposeConditionalDetector implements IRefactoringDetector {

    public analyze(history: TrackedEdit[], document: vscode.TextDocument, project: Project): DetectionResult | null {
        if (history.length === 0) return null;

        // searching for deleted conditions
        let cutIndex = history.map(a => a.action).lastIndexOf(EditAction.CutOrDelete);
        let deletedText = "";
        let isOverwrite = false;

        const lastEdit = history[history.length - 1];

        if (lastEdit.action === EditAction.Overwrite) {
            deletedText = lastEdit.deletedText?.trim() || "";
            isOverwrite = true;
            cutIndex = history.length - 1;
        }
        else if (cutIndex !== -1) {
            deletedText = history[cutIndex].deletedText?.trim() || "";
        }

        if (!deletedText) return null;

        // complexity check
        const hasConditionOperators = /[&|<>=!]/.test(deletedText);
        if (!hasConditionOperators) return null;

        const editsAfterCut = isOverwrite ? [lastEdit] : history.slice(cutIndex + 1);
        const isTypingMethod = editsAfterCut.some(edit => 
            (edit.action === EditAction.Typing || edit.action === EditAction.Paste || edit.action === EditAction.Overwrite) &&
            edit.insertedText.includes('(')
        );

        if (!isTypingMethod) return null;

        // analyzing ast
        const sourceFile = project.getSourceFile('temp.ts')!;
        const lastChangeOffset = document.offsetAt(lastEdit.range.start);

        // searching all callExpressions
        const callExpressions = sourceFile?.getDescendantsOfKind(SyntaxKind.CallExpression)!;

        for (const callExpr of callExpressions) {
            const start = callExpr.getStart();
            const end = callExpr.getEnd();
            
            if (lastChangeOffset >= start && lastChangeOffset <= end + 1) {

                const ifStatement = callExpr.getFirstAncestorByKind(SyntaxKind.IfStatement);

                if (ifStatement) {

                    const ifCond = ifStatement.getExpression();

                    if (start >= ifCond.getStart() && end <= ifCond.getEnd()) {
                        const methodName = callExpr.getExpression().getText();

                        const methodDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.MethodDeclaration);
                        const functionDeclarations = sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration);

                        const isDefinedLocally = [...methodDeclarations, ...functionDeclarations]
                            .some(decl => decl.getName() === methodName);

                        if (!isDefinedLocally) {
                            return {
                                name: "Decompose Conditional",
                                message: `Extract the deleted conditionin the new method '${methodName}'`,
                                actionCommand: "editor.action.refactor"
                            };
                        }
                    }
                }
            }
        }
        return null;
    }
}