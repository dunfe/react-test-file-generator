import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs"

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand(
        "react-test-generator.createTestFile",
        async (uri: vscode.Uri) => {
            if (!uri) {
                vscode.window.showErrorMessage("No file selected")
                return
            }

            try {
                const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri)
                if (!workspaceFolder) {
                    vscode.window.showErrorMessage(
                        "File is not in a workspace"
                    )
                    return
                }

                const originalFilePath = uri.fsPath
                const workspacePath = workspaceFolder.uri.fsPath
                const relativePath = path.relative(
                    workspacePath,
                    originalFilePath
                )

                const testFilePath = generateTestFilePath(
                    workspacePath,
                    relativePath
                )

                if (fs.existsSync(testFilePath)) {
                    const answer = await vscode.window.showInformationMessage(
                        "Test file already exists. Do you want to open it?",
                        "Yes",
                        "No"
                    )

                    if (answer === "Yes") {
                        const doc =
                            await vscode.workspace.openTextDocument(
                                testFilePath
                            )
                        await vscode.window.showTextDocument(doc)
                    }
                    return
                }

                const fileExtension = path.extname(originalFilePath)
                const isReactFile =
                    fileExtension === ".tsx" || fileExtension === ".jsx"
                const componentName = extractComponentName(originalFilePath)
                const testContent = generateTestContent(
                    componentName,
                    relativePath,
                    isReactFile,
                    originalFilePath
                )

                await createTestFile(testFilePath, testContent)

                const doc =
                    await vscode.workspace.openTextDocument(testFilePath)
                await vscode.window.showTextDocument(doc)

                vscode.window.showInformationMessage(
                    `Test file created: ${testFilePath}`
                )
            } catch (error) {
                vscode.window.showErrorMessage(
                    `Error creating test file: ${error}`
                )
            }
        }
    )

    context.subscriptions.push(disposable)
}

function generateTestFilePath(
    workspacePath: string,
    relativePath: string
): string {
    const parsedPath = path.parse(relativePath)
    const testFileName = `${parsedPath.name}.test${parsedPath.ext}`
    const testRelativePath = path.join(
        "tests",
        parsedPath.dir,
        testFileName
    )
    return path.join(workspacePath, testRelativePath)
}

function extractComponentName(filePath: string): string {
    const fileName = path.basename(filePath, path.extname(filePath))
    if (fileName === "page" || fileName === "layout") {
        const dirName = path.basename(path.dirname(filePath))
        return dirName.charAt(0).toUpperCase() + dirName.slice(1) + "Page"
    }
    return fileName.charAt(0).toUpperCase() + fileName.slice(1)
}

function detectExportType(filePath: string, componentName: string): 'default' | 'named' {
    try {
        const fileContent = fs.readFileSync(filePath, "utf8")
        
        const defaultExportRegex = new RegExp(`export\\s+default\\s+(?:function\\s+)?${componentName}\\b|export\\s*\\{[^}]*${componentName}\\s+as\\s+default[^}]*\\}`)
        const namedExportRegex = new RegExp(`export\\s+(?:const|let|var|function|class)\\s+${componentName}\\b|export\\s*\\{[^}]*\\b${componentName}\\b[^}]*\\}`)
        
        if (defaultExportRegex.test(fileContent)) {
            return 'default'
        } else if (namedExportRegex.test(fileContent)) {
            return 'named'
        }
        
        return 'default'
    } catch (error) {
        return 'default'
    }
}

function generateTestContent(
    componentName: string,
    relativePath: string,
    isReactFile: boolean,
    originalFilePath: string
): string {
    const importPath = calculateImportPath(relativePath)
    const exportType = detectExportType(originalFilePath, componentName)
    
    let mockStatements = ""
    let imports = ""
    
    try {
        const fileContent = fs.readFileSync(originalFilePath, "utf8")
        const importLines = extractImports(fileContent)
        
        for (const importLine of importLines) {
            const mockStatement = generateMockStatement(importLine)
            if (mockStatement) {
                mockStatements += mockStatement + "\n"
            }
        }
        
        if (mockStatements) {
            mockStatements += "\n"
        }
    } catch (error) {
        // If we can't read the file, continue without mocks
    }

    const importStatement = exportType === 'default' 
        ? `import ${componentName} from "${importPath}"`
        : `import { ${componentName} } from "${importPath}"`

    if (isReactFile) {
        return `${mockStatements}import { render, screen } from "@testing-library/react"
${importStatement}

describe("${componentName}", () => {
    it("renders without crashing", () => {
        render(<${componentName} />)
    })

    it("renders expected content", () => {
        render(<${componentName} />)
    })

    it("handles user interactions", () => {
        render(<${componentName} />)
    })
})
`
    } else {
        return `${mockStatements}${importStatement}

describe("${componentName}", () => {
    it("should be defined", () => {
        expect(${componentName}).toBeDefined()
    })

    it("should work correctly", () => {})

    it("should handle edge cases", () => {})
})
`
    }
}

function extractImports(fileContent: string): string[] {
    const importRegex = /^import\s+.*?from\s+['"]([^'"]+)['"];?$/gm
    const matches = []
    let match
    
    while ((match = importRegex.exec(fileContent)) !== null) {
        const importPath = match[1]
        if (!importPath.startsWith('@testing-library') && !importPath.startsWith('jest')) {
            matches.push(match[0])
        }
    }
    
    return matches
}

function convertToAliasPath(relativePath: string): string {
    let normalizedPath = relativePath
    
    if (normalizedPath.startsWith('./')) {
        normalizedPath = normalizedPath.substring(2)
    } else if (normalizedPath.startsWith('../')) {
        normalizedPath = normalizedPath.replace(/^\.\.\//, '')
        while (normalizedPath.startsWith('../')) {
            normalizedPath = normalizedPath.replace(/^\.\.\//, '')
        }
    }
    
    return '@/' + normalizedPath
}

function generateMockStatement(importLine: string): string {
    const importMatch = importLine.match(/from\s+['"]([^'"]+)['"]/)
    if (!importMatch) return ""
    
    let modulePath = importMatch[1]
    
    if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
        modulePath = convertToAliasPath(modulePath)
    }
    
    const defaultImportMatch = importLine.match(/import\s+(\w+)\s+from/)
    const namedImportsMatch = importLine.match(/import\s+\{([^}]+)\}\s+from/)
    const namespaceImportMatch = importLine.match(/import\s+\*\s+as\s+(\w+)\s+from/)
    
    let mockImplementation = "{"
    
    if (modulePath.includes('react') && !modulePath.includes('react-dom')) {
        mockImplementation += `
        __esModule: true,
        default: () => null,
        useState: jest.fn(),
        useEffect: jest.fn(),
        useContext: jest.fn(),
        useMemo: jest.fn(),
        useCallback: jest.fn(),
        useRef: jest.fn(),
        createElement: jest.fn(),
        forwardRef: jest.fn()`
    } else {
        mockImplementation += `
        __esModule: true`
        
        if (defaultImportMatch) {
            const defaultImport = defaultImportMatch[1]
            if (defaultImport.charAt(0) === defaultImport.charAt(0).toUpperCase()) {
                mockImplementation += `,
        default: jest.fn((props) => <div data-testid="mock-${defaultImport.toLowerCase()}">{JSON.stringify(props)}</div>)`
            } else {
                mockImplementation += `,
        default: jest.fn()`
            }
        }
        
        if (namedImportsMatch) {
            const namedImports = namedImportsMatch[1].split(',').map(imp => imp.trim())
            for (const namedImport of namedImports) {
                const cleanImport = namedImport.replace(/\s+as\s+\w+/, '').trim()
                if (cleanImport.charAt(0) === cleanImport.charAt(0).toUpperCase()) {
                    mockImplementation += `,
        ${cleanImport}: jest.fn((props) => <div data-testid="mock-${cleanImport.toLowerCase()}">{JSON.stringify(props)}</div>)`
                } else {
                    mockImplementation += `,
        ${cleanImport}: jest.fn()`
                }
            }
        }
        
        if (namespaceImportMatch) {
            const namespaceVar = namespaceImportMatch[1]
            mockImplementation += `,
        ${namespaceVar}: {}`
        }
    }
    
    mockImplementation += `
    }`
    
    return `jest.mock('${modulePath}', () => (${mockImplementation}))`
}

function calculateImportPath(relativePath: string): string {
    const parsedPath = path.parse(relativePath)
    const componentPath = path.join(parsedPath.dir, parsedPath.name)
    return "@/" + componentPath.replace(/\\/g, "/")
}

async function createTestFile(
    filePath: string,
    content: string
): Promise<void> {
    const dir = path.dirname(filePath)

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(filePath, content, "utf8")
}

export function deactivate() {}