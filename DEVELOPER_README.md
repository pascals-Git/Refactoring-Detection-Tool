# Refactoring-Detection-Tool 

 A TypeScript VSCode-Extension.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [File Structure](#file-structure)

## Features

Refactorings featured yet:

- Extract Method
- Rename Variable
- Inline Variable
- Replace Magic Literal
- Decompose Conditional 

## Tech Stack

- **TypeScript**: 7.0.2
- **node.js**: 24.21.0
- **npm**: 11.19.0
- **ts-morph**: 28.0.0

## File Structure

src/
 ├── extension.ts                 
 ├── tracker/
 │    └── EditTracker.ts          
 └── detectors/
      ├── IRefactoringDetector.ts 
      ├── DetectorManager.ts      
      ├── ExtractMethodDetector.ts
      ├── RenameVariableDetector.ts
      ├── InlineVariableDetector.ts
      ├── ReplaceMagicLiteralDetector.ts
      └── DecomposeConditionalDetector.ts