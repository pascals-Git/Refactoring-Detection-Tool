import * as vscode from 'vscode';
import { Project } from 'ts-morph';
import { TrackedEdit } from '../tracker/EditTracker';

export interface DetectionResult {
    name: string;               // name of refactoring
    message: string;            // title of command
    actionCommand: string;      // command trigger
}

export interface IRefactoringDetector {
    analyze(history: TrackedEdit[], document: vscode.TextDocument, project: Project): DetectionResult | null;
}
