"use strict";
import * as vscode from "vscode";
import { AppInsightsClient } from "./common/appInsightsClient";
import { Utility } from "./common/utility";
import { ConnectionNode } from "./model/connectionNode";
import { DatabaseNode } from "./model/databaseNode";
import { INode } from "./model/INode";
import { TableNode } from "./model/tableNode";
import { MySQLTreeDataProvider } from "./mysqlTreeDataProvider";
import { Global } from "./common/global";

export function activate(context: vscode.ExtensionContext) {
    AppInsightsClient.sendEvent("loadExtension");

    const mysqlTreeDataProvider = new MySQLTreeDataProvider(context);
    
    Global.secrets = context.secrets;

    context.subscriptions.push(vscode.window.registerTreeDataProvider("mysql", mysqlTreeDataProvider));

    context.subscriptions.push(vscode.commands.registerCommand("mysql.refresh", (node: INode) => {
        AppInsightsClient.sendEvent("refresh");
        mysqlTreeDataProvider.refresh(node);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("mysql.addConnection", () => {
        mysqlTreeDataProvider.addConnection();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("mysql.deleteConnection", (connectionNode: ConnectionNode) => {
        connectionNode.deleteConnection(context, mysqlTreeDataProvider);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("mysql.runQuery", () => {
        Utility.runQuery();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("mysql.newQuery", (databaseOrConnectionNode: DatabaseNode | ConnectionNode) => {
        databaseOrConnectionNode.newQuery();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("mysql.selectDatabase", (databaseNode: DatabaseNode) => {
        databaseNode.selectDatabase();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("mysql.selectTop1000", (tableNode: TableNode) => {
        tableNode.selectTop1000();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("mysql.copyTableName", (tableNode: TableNode) => {
        tableNode.copyTableName();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("mysql.showTableStructure", (tableNode: TableNode) => {
        tableNode.showTableStructure();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("mysql.viewTableStructureFromEditor", async () => {
        if (!vscode.window.activeTextEditor) {
            vscode.window.showWarningMessage("No active editor");
            return;
        }

        const activeTextEditor = vscode.window.activeTextEditor;
        const selection = activeTextEditor.selection;

        let selectedText: string;
        if (selection.isEmpty) {
            // If no selection, get current word
            const document = activeTextEditor.document;
            const wordRange = document.getWordRangeAtPosition(activeTextEditor.selection.active);
            if (wordRange) {
                selectedText = document.getText(wordRange);
            } else {
                vscode.window.showWarningMessage("Please select a table name");
                return;
            }
        } else {
            selectedText = activeTextEditor.document.getText(selection);
        }

        // Trim the selected text
        selectedText = selectedText.trim();

        // Parse table name from selected text (could be "table" or "database.table")
        let tableName = selectedText;
        let databaseName = "";

        // Remove backticks if present
        tableName = tableName.replace(/`/g, "");

        // Check if contains dot (database.table format)
        const dotIndex = tableName.indexOf('.');
        if (dotIndex !== -1) {
            databaseName = tableName.substring(0, dotIndex);
            tableName = tableName.substring(dotIndex + 1);
        }

        // Check if we have an active connection
        if (!Global.activeConnection) {
            vscode.window.showWarningMessage("No MySQL connection. Please select a database first.");
            return;
        }

        // If database name is not in selection, use the one from active connection
        if (!databaseName && Global.activeConnection.database) {
            databaseName = Global.activeConnection.database;
        }

        if (!databaseName) {
            vscode.window.showWarningMessage("Cannot determine database. Please select a database first or use format: database.table");
            return;
        }

        // Create a temporary TableNode and call showTableStructure
        const tempTableNode = new TableNode(
            Global.activeConnection.host,
            Global.activeConnection.user,
            Global.activeConnection.password,
            Global.activeConnection.port,
            databaseName,
            tableName,
            Global.activeConnection.certPath
        );

        await tempTableNode.showTableStructure();
    }));
}

export function deactivate() {
}
