import * as vscode from "vscode";
import { Utility } from "./common/utility";

// Helper function to calculate string length (Chinese characters count as 2)
function getStringLength(str: string): number {
    let length = 0;
    for (let i = 0; i < str.length; i++) {
        const charCode = str.charCodeAt(i);
        // Chinese, Japanese, Korean characters are usually in ranges:
        // CJK Unified Ideographs: U+4E00–U+9FFF
        // CJK Extension A: U+3400–U+4DBF
        // CJK Extension B-F: U+20000–U+2EBEF (surrogate pairs)
        // Fullwidth ASCII variants: U+FF01–U+FF60
        if (charCode >= 0x4E00 && charCode <= 0x9FFF ||
            charCode >= 0x3400 && charCode <= 0x4DBF ||
            charCode >= 0xFF01 && charCode <= 0xFF60) {
            length += 2;
        } else {
            length += 1;
        }
    }
    return length;
}

export class SqlResultWebView {
    private static currentPanel: vscode.WebviewPanel | undefined = null;
    private static currentDatabase: string | undefined = undefined;
    private static currentTable: string | undefined = undefined;

    public static async show(data, title, sql?: string, totalRows?: number, database?: string, table?: string) {
        // Store current database and table for subsequent queries
        SqlResultWebView.currentDatabase = database;
        SqlResultWebView.currentTable = table;

        // First, create/open SQL text document
        await Utility.createSQLTextDocument(sql || "");
        // Split editor into two rows (上下分栏)
        await vscode.commands.executeCommand('workbench.action.editorLayoutTwoRows');

        // Create webview panel in the bottom group (ViewColumn.Two in two-row layout)
        const panel = vscode.window.createWebviewPanel("MySQL", title, vscode.ViewColumn.Two, {
            retainContextWhenHidden: true,
            enableScripts: true,
        });

        SqlResultWebView.currentPanel = panel;
        panel.webview.html = SqlResultWebView.getWebviewContent(data, sql, totalRows);

        // Focus the top editor (SQL) group and resize to 30%
        await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');
        // Decrease editor height to ~30% (each decrease is ~5%)
        for (let i = 0; i < 4; i++) {
            await vscode.commands.executeCommand('workbench.action.decreaseViewHeight');
        }

        // Handle panel close event
        panel.onDidDispose(() => {
            SqlResultWebView.currentPanel = undefined;
        });

        // Handle messages from webview
        panel.webview.onDidReceiveMessage(
            message => {
                if (message.command === 'runQuery') {
                    // Run the new SQL query and update current panel
                    Utility.runQueryWithTotal(message.sql, SqlResultWebView.currentDatabase, SqlResultWebView.currentTable, true);
                }
            },
            undefined,
            undefined
        );
    }

    public static updatePanel(data: any, sql?: string, totalRows?: number, database?: string, table?: string) {
        // Update the stored database and table
        if (database !== undefined) SqlResultWebView.currentDatabase = database;
        if (table !== undefined) SqlResultWebView.currentTable = table;

        if (SqlResultWebView.currentPanel) {
            SqlResultWebView.currentPanel.webview.html = SqlResultWebView.getWebviewContent(data, sql, totalRows);
        }
    }

    public static getWebviewContent(data, sql?: string, totalRows?: number): string {
        const style = `
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    margin: 0;
                    padding: 16px;
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                }
                table {
                    border-collapse: collapse;
                    width: 100%;
                    font-size: 13px;
                }
                th {
                    background-color: #e0e0e0;
                    border: 1px solid #d0d0d0;
                    padding: 8px 12px;
                    text-align: left;
                    font-weight: 600;
                    position: sticky;
                    top: 0;
                }
                td {
                    border: 1px solid #e0e0e0;
                    padding: 6px 10px;
                }
                tr:hover {
                    background-color: var(--vscode-editor-hoverHighlightBackground);
                }
                .cell-wrapper {
                    display: inline-block;
                    max-width: 100%;
                }
                .cell-content {
                    white-space: nowrap;
                    display: inline-block;
                }
                .cell-content.truncated {
                    max-width: calc(100% - 30px);
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .expand-btn {
                    background: none;
                    border: none;
                    color: #888;
                    cursor: pointer;
                    padding: 2px 4px;
                    font-size: 14px;
                    display: none;
                    margin-left: 4px;
                }
                .expand-btn:hover {
                    color: var(--vscode-textLink-foreground);
                }
                .cell-content.truncated + .expand-btn {
                    display: inline-flex;
                }
                .empty-cell {
                    color: #999;
                    font-style: italic;
                }
                #modal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    z-index: 1000;
                    justify-content: center;
                    align-items: center;
                }
                #modal.show {
                    display: flex;
                }
                .modal-content {
                    background-color: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 8px;
                    padding: 20px;
                    max-width: 80%;
                    max-height: 80%;
                    overflow: auto;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    position: relative;
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                .modal-title {
                    font-weight: 600;
                    font-size: 14px;
                }
                .close-btn {
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    color: var(--vscode-editor-foreground);
                    padding: 0;
                    width: 28px;
                    height: 28px;
                }
                .close-btn:hover {
                    background-color: var(--vscode-editor-hoverHighlightBackground);
                    border-radius: 4px;
                }
                .modal-value {
                    word-wrap: break-word;
                    white-space: pre-wrap;
                    font-family: Consolas, Monaco, monospace;
                    font-size: 13px;
                    line-height: 1.5;
                }
                .no-data {
                    color: var(--vscode-descriptionForeground);
                    padding: 20px;
                    text-align: center;
                }
                .row-count {
                    margin-bottom: 12px;
                    color: var(--vscode-descriptionForeground);
                    font-size: 12px;
                }
                .query-bar {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 12px;
                    padding: 8px;
                    background-color: var(--vscode-editor-selectionBackground);
                    border-radius: 4px;
                }
                .query-input {
                    flex: 1;
                    padding: 6px 10px;
                    font-family: Consolas, Monaco, 'Courier New', monospace;
                    font-size: 13px;
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 2px;
                    outline: none;
                }
                .query-input:focus {
                    border-color: var(--vscode-focusBorder);
                }
                .run-btn {
                    padding: 6px 16px;
                    font-size: 13px;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 2px;
                    cursor: pointer;
                    white-space: nowrap;
                }
                .run-btn:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .total-info {
                    color: var(--vscode-textLink-foreground);
                    font-size: 12px;
                    white-space: nowrap;
                }
            </style>
        `;

        const script = `
            <script>
                const vscode = acquireVsCodeApi();

                function showModal(value) {
                    document.getElementById('modalValue').textContent = value;
                    document.getElementById('modal').classList.add('show');
                }
                function closeModal() {
                    document.getElementById('modal').classList.remove('show');
                }
                document.getElementById('modal').addEventListener('click', function(e) {
                    if (e.target.id === 'modal') {
                        closeModal();
                    }
                });
                document.addEventListener('keydown', function(e) {
                    if (e.key === 'Escape') {
                        closeModal();
                    }
                });

                function runQuery() {
                    const sqlInput = document.getElementById('sqlInput');
                    if (sqlInput) {
                        vscode.postMessage({
                            command: 'runQuery',
                            sql: sqlInput.value
                        });
                    }
                }

                // Listen for Enter key in SQL input
                document.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && e.target.id === 'sqlInput' && !e.shiftKey) {
                        e.preventDefault();
                        runQuery();
                    }
                });
            <\/script>
        `;

        const modal = `
            <div id="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <span class="modal-title">Cell Content</span>
                        <button class="close-btn" onclick="closeModal()">&times;</button>
                    </div>
                    <div class="modal-value" id="modalValue"></div>
                </div>
            </div>
        `;

        const head = [].concat(
            "<!DOCTYPE html>",
            "<html>",
            "<head>",
            '<meta http-equiv="Content-type" content="text/html;charset=UTF-8">',
            '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
            style,
            "</head>",
            "<body>",
        ).join("\n");

        const body = SqlResultWebView.render(data, sql, totalRows);

        const tail = [
            modal,
            script,
            "</body>",
            "</html>",
        ].join("\n");

        return head + body + tail;
    }

    private static render(rows, sql?: string, totalRows?: number) {
        if (rows.length === 0) {
            return '<div class="no-data">No data</div>';
        }

        let head = "";
        for (const field in rows[0]) {
            if (rows[0].hasOwnProperty(field)) {
                head += "<th>" + this.escapeHtml(field) + "</th>";
            }
        }

        // Display SQL input bar and row count at the top
        const sqlValue = sql ? this.escapeHtml(sql.trim()) : "";
        const sqlDisplay = sql ? this.escapeHtml(sql.trim()) : "Query";
        const totalInfo = totalRows !== undefined
            ? `<span class="total-info">(total ${totalRows} rows)</span>`
            : "";
        const headerInfo = `<div class="query-bar">
            <input type="text" id="sqlInput" class="query-input" value="${sqlValue}" placeholder="Enter SQL query...">
            <button class="run-btn" onclick="runQuery()">Run</button>
            ${totalInfo}
        </div>`;
        let body = headerInfo + "<table><tr>" + head + "</tr>";

        rows.forEach((row) => {
            body += "<tr>";
            for (const field in row) {
                if (row.hasOwnProperty(field)) {
                    const value = row[field];
                    const fullValue = value === null || value === undefined ? 'NULL' : String(value);
                    const displayValue = value === null || value === undefined ? '<span class="empty-cell">NULL</span>' : this.escapeHtml(fullValue);

                    // Calculate display length (Chinese counts as 2, English as 1)
                    const displayLength = getStringLength(fullValue);
                    // Use 50 as threshold (50 English chars or 25 Chinese chars)
                    const isTruncated = displayLength > 50;

                    // Truncate for display if needed
                    let truncatedValue = fullValue;
                    if (isTruncated) {
                        let currentLength = 0;
                        let truncateIndex = 0;
                        for (let i = 0; i < fullValue.length; i++) {
                            const charCode = fullValue.charCodeAt(i);
                            const charLength = (charCode >= 0x4E00 && charCode <= 0x9FFF ||
                                                charCode >= 0x3400 && charCode <= 0x4DBF ||
                                                charCode >= 0xFF01 && charCode <= 0xFF60) ? 2 : 1;
                            if (currentLength + charLength > 47) { // 47 + "..."
                                break;
                            }
                            currentLength += charLength;
                            truncateIndex = i + 1;
                        }
                        truncatedValue = fullValue.substring(0, truncateIndex);
                    }

                    const escapedFullValue = JSON.stringify(fullValue);
                    const escapedTruncatedValue = this.escapeHtml(truncatedValue);

                    body += "<td>" +
                        "<div class=\"cell-wrapper\">" +
                        "<span class=\"cell-content" + (isTruncated ? " truncated" : "") + "\">" + (isTruncated ? escapedTruncatedValue + "..." : displayValue) + "</span>" +
                        (isTruncated ? "<button class=\"expand-btn\" onclick='showModal(" + escapedFullValue + ")'>...</button>" : "") +
                        "</div>" +
                        "</td>";
                }
            }
            body += "</tr>";
        });

        return body + "</table>";
    }

    private static escapeHtml(text: string): string {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }
}
