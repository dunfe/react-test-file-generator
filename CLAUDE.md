# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VS Code extension that generates unit test files for React components. The extension adds a right-click context menu option "Create Unit Test File" for React component files (.tsx/.jsx) that automatically creates test files in a `/tests` folder with proper directory structure and basic test templates.

## Development Commands

- **Build the extension**: `npm run compile`
- **Watch mode for development**: `npm run watch` 
- **Package the extension**: `npm run package`
- **Prepare for publishing**: `npm run vscode:prepublish`

## Architecture

### Core Extension Logic (`src/extension.ts`)

The extension follows VS Code's standard extension structure:

- **Command Registration**: Registers `react-test-generator.createTestFile` command
- **File Path Processing**: Uses Node.js `path` module to maintain directory structure in `/tests` folder
- **Test Generation**: Creates test files with React Testing Library setup and Jest mocks
- **Mock Generation**: Automatically generates Jest mocks for component imports using specific patterns:
  - React imports get comprehensive mock implementations
  - Component imports (PascalCase) get mocked as div elements with data-testid
  - Function imports get basic Jest function mocks

### Test File Structure

Generated test files follow this pattern:
- Original: `/app/(app)/page.tsx` → Test: `/tests/app/(app)/page.test.tsx`
- Import paths use `@/` alias convention
- Creates Jest mocks for all non-testing-library imports
- Includes basic test structure with describe blocks and placeholder tests

### Mock Generation Logic

The extension includes sophisticated mock generation (`generateMockStatement` function) that:
- Parses import statements from original files
- Creates appropriate Jest mocks based on import types (default, named, namespace)
- Handles React-specific mocking patterns
- Uses component naming conventions to generate test-friendly mock implementations

## File Naming and Structure

- Uses PascalCase for component naming extraction
- Handles Next.js special files (`page.tsx`, `layout.tsx`) by using directory name
- Maintains original directory structure within `/tests` folder
- Uses `.test.tsx`/`.test.jsx` naming convention

## TypeScript Configuration

- Target: ES2020
- CommonJS modules
- Strict mode enabled
- Source maps for debugging
- Output directory: `out/`