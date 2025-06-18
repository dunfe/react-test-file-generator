# React Test File Generator

This VS Code extension helps you quickly create unit test files for your React components with proper file structure.

## Features

- Right-click on any React component file (.tsx or .jsx) in the Explorer
- Select "Create Unit Test File" from the context menu
- Automatically creates a test file in the `/tests` folder maintaining the original directory structure
- Generates a basic test template with React Testing Library

## Usage

1. Right-click on a React component file in the VS Code Explorer
2. Select "Create Unit Test File" from the context menu
3. The extension will create a test file in the `/tests` folder with the same directory structure

### Example

For a component at `/app/(app)/page.tsx`, the extension will create:
`/tests/app/(app)/page.test.tsx`

## Requirements

- VS Code 1.74.0 or higher
- React project with TypeScript or JavaScript

## Extension Settings

This extension doesn't require any configuration.

## Known Issues

None at this time.

## Release Notes

### 0.0.1

Initial release of React Test File Generator