/* eslint-disable curly */
import * as vscode from 'vscode';

export enum EditAction {
    Typing = "Typing",              // single char typed
    Paste = "Paste",                // few chars added
    CutOrDelete = "CutOrDelete",    // selected block deleted or cut
    Backspace = "Backspace",        // single char deleted
    Overwrite = "Overwrite",        // selected text replaced by other text
    Unknown = "Unknown"
}

export interface TrackedEdit {
    timestamp: number;
    action: EditAction;
    insertedText: string;
    deletedTextLength: number;
    documentUri: vscode.Uri;
    range: vscode.Range;
    deletedText?: string;
}

export class EditTracker {
    private history: TrackedEdit[] = [];
    private lastSelection: vscode.Range | undefined;    
    private lastSelectionText: string = "";

    public updateLastSelection(editor: vscode.TextEditor) {
        const selection = editor.selection;
        if (!selection.isEmpty) {
            this.lastSelection = selection;
            this.lastSelectionText = editor.document.getText(selection);
        }
        else {
            this.lastSelection = undefined;
            this.lastSelectionText = "";
        }
    }

    public recordEdit(event: vscode.TextDocumentChangeEvent) {
        // saving only relevant changes in here        
        if (event.contentChanges.length === 0) return;

        const change = event.contentChanges[0];
        const action = this.categorizeChange(change);

        this.history.push({
            timestamp: Date.now(),
            action: action,            
            documentUri: event.document.uri,
            insertedText: change.text,
            deletedTextLength: change.rangeLength,
            deletedText: action === EditAction.CutOrDelete ? this.lastSelectionText : undefined,
            range: change.range,
        });

        // history limit to 50
        if (this.history.length > 50) {
            this.history.shift();
        }        
    }

    private categorizeChange(change: vscode.TextDocumentContentChangeEvent): EditAction {
        const textInserted = change.text;
        const lengthRemoved = change.rangeLength;

        if (textInserted.length === 1 && lengthRemoved === 0) {
            return EditAction.Typing;
        }
        else if (textInserted.length > 1 && lengthRemoved === 0) {
            return EditAction.Paste;
        }
        else if (textInserted === '' && lengthRemoved > 0) {
            if (this.lastSelection && this.lastSelection.isEqual(change.range)) {
                return EditAction.CutOrDelete;
            }
            return EditAction.Backspace;
        }
        else if (textInserted.length > 0 && lengthRemoved > 0) {
            return EditAction.Overwrite;
        }
        return EditAction.Unknown;
    }

    public getHistory(): TrackedEdit[] {
        return this.history;
    }

    public clearHistory() {
        this.history = [];
    }

    // reverting changes done by the user
    public async revertTrackedChanges(document: vscode.TextDocument): Promise<boolean> {

        const cutIndex = this.history.map(h => h.action).lastIndexOf(EditAction.CutOrDelete);

        if (cutIndex === -1) {
            console.log("Cut-Event not found, nothing to revert.");
            return false;
        }

        const cutEdit = this.history[cutIndex];
        if (!cutEdit.deletedText) return false;
    
        // "reverse-iteration-changes"
        const workspaceEdit = new vscode.WorkspaceEdit();

        // find all edits happend after the cut
        const editsAfterCut = this.history.slice(cutIndex +1);

        
        for (let i = editsAfterCut.length -1; i > 0; i--) {
            const edit = editsAfterCut[i];
            // calculate how long the text to delete is 
            if (edit.insertedText.length > 0) {
                const startOffset = document.offsetAt(edit.range.start);
                const endPosition = document.positionAt(startOffset + edit.insertedText.length);
                const rangeToDelete = new vscode.Range(edit.range.start, endPosition);

                workspaceEdit.delete(edit.documentUri,  rangeToDelete);
            }
        }

        // reverting cut out code at origin position
        workspaceEdit.insert(cutEdit.documentUri, cutEdit.range.start, cutEdit.deletedText);

        const success = await vscode.workspace.applyEdit(workspaceEdit);

        
        return success;
    }        
}