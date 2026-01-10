import * as vscode from "vscode";
import { TableFilterState } from "./mysqlTreeDataProvider";

export class FilterInputPanel {
    private static panel: vscode.WebviewView | undefined = undefined;
    private static currentFilter: string = "";

    public static initialize(context: vscode.ExtensionContext) {
        // Register the webview view provider
        const provider = new FilterViewProvider();
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider('mysqlFilter', provider)
        );
    }
}

class FilterViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor() {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: []
        };

        webviewView.webview.html = this.getWebviewContent();

        webviewView.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'updateFilter':
                        TableFilterState.instance.setFilterText(message.text);
                        break;
                    case 'clearFilter':
                        TableFilterState.instance.clear();
                        break;
                }
            },
            null,
        );

        // Listen to filter changes from external sources
        TableFilterState.instance.onDidChangeFilter(() => {
            this._view?.webview.postMessage({
                command: 'setFilter',
                text: TableFilterState.instance.filterText
            });
        });
    }

    private getWebviewContent(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        html {
            height: auto;
        }
        body {
            padding: 0;
            font-family: var(--vscode-font-family);
            font-size: 12px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
            line-height: 1;
        }
        .input-container {
            display: flex;
            gap: 2px;
            align-items: center;
            width: 100%;
            padding: 3px 4px;
        }
        .search-icon {
            font-size: 11px;
            flex-shrink: 0;
        }
        input {
            flex: 1;
            padding: 1px 4px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: inherit;
            font-size: inherit;
            border-radius: 2px;
            min-width: 0;
            line-height: 1.4;
        }
        input:focus {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: -1px;
        }
        input::placeholder {
            color: var(--vscode-input-placeholderForeground);
        }
        .clear-btn {
            padding: 1px 4px;
            border: none;
            background-color: transparent;
            color: var(--vscode-descriptionForeground);
            cursor: pointer;
            border-radius: 2px;
            font-family: inherit;
            font-size: 10px;
            flex-shrink: 0;
            display: none;
            line-height: 1.4;
        }
        .clear-btn:hover {
            background-color: var(--vscode-toolbar-hoverBackground);
        }
        .clear-btn.visible {
            display: block;
        }
    </style>
</head>
<body>
    <div class="input-container">
        <span class="search-icon">🔍</span>
        <input type="text" id="filterInput" placeholder="Filter tables..." autocomplete="off">
        <button id="clearBtn" class="clear-btn">✕</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const input = document.getElementById('filterInput');
        const clearBtn = document.getElementById('clearBtn');

        let timeout = null;

        input.addEventListener('input', (e) => {
            const text = e.target.value;
            updateClearButton(text);

            // Real-time filter update
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                vscode.postMessage({
                    command: 'updateFilter',
                    text: text
                });
            }, 100);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                clearFilter();
            }
        });

        clearBtn.addEventListener('click', clearFilter);

        function clearFilter() {
            input.value = '';
            updateClearButton('');
            vscode.postMessage({
                command: 'clearFilter'
            });
            input.focus();
        }

        function updateClearButton(text) {
            if (text) {
                clearBtn.classList.add('visible');
            } else {
                clearBtn.classList.remove('visible');
            }
        }

        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'setFilter') {
                input.value = message.text;
                updateClearButton(message.text);
            }
        });

        // Focus input on load
        input.focus();
    </script>
</body>
</html>`;
    }
}
