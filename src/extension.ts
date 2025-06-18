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
                    isReactFile
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

function generateTestContent(
    componentName: string,
    relativePath: string,
    isReactFile: boolean
): string {
    const importPath = calculateImportPath(relativePath)

    if (isReactFile) {
        return `import { render, screen } from "@testing-library/react"
import { ${componentName} } from "${importPath}"

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
        return `import { ${componentName} } from "${importPath}"

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

function calculateImportPath(relativePath: string): string {
    const parsedPath = path.parse(relativePath)
    const componentPath = path.join(parsedPath.dir, parsedPath.name)
    const depth = componentPath.split(path.sep).length
    const backPath = "../".repeat(depth + 1)
    return backPath + componentPath.replace(/\\/g, "/")
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