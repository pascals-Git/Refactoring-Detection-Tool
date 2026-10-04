/* eslint-disable curly */
import * as vscode from 'vscode';
import { Project } from 'ts-morph';
import { TrackedEdit } from '../tracker/EditTracker';
import { DetectionResult, IRefactoringDetector } from './IRefactoringDetector';
import { RenameVariableDetector } from './RenameVariableDetector';
import { ExtractMethodDetector } from './ExtractMethodDetector';
import { ReplaceMagicLiteral } from './ReplaceMagicLiteralDetector';
import { InlineVariableDetector } from './InlineVariableDetector';
import { DecomposeConditionalDetector } from './DecomposeConditionalDetector';

export class DetectorManager {
    private detectors: IRefactoringDetector[] = [];
    private project: Project;

    constructor() {
        this.project = new Project({
            useInMemoryFileSystem: true
        });
        // register all detectors here
        this.detectors.push(new RenameVariableDetector());
        this.detectors.push(new ExtractMethodDetector());
        this.detectors.push(new ReplaceMagicLiteral());
        this.detectors.push(new InlineVariableDetector());
        this.detectors.push(new DecomposeConditionalDetector());
    }

    public checkForRefactoring(history: TrackedEdit[], document: vscode.TextDocument): DetectionResult | null {
        if (history.length === 0) return null;

        // parsing SourceFile from ts-morph just once for better performance
        this.project.createSourceFile('temp.ts', document.getText(), { overwrite: true });

        // checking for any detections
        for (const detector of this.detectors) {
            const result = detector.analyze(history, document, this.project);
            if (result) {
                return result;
            }
        }
        return null;
    }
}