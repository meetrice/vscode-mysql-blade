import * as mysql from "mysql2";
import * as path from "path";
import * as vscode from "vscode";
import { AppInsightsClient } from "../common/appInsightsClient";
import { Global } from "../common/global";
import { OutputChannel } from "../common/outputChannel";
import { Utility } from "../common/utility";
import { InfoNode } from "./infoNode";
import { INode } from "./INode";

export class ColumnNode implements INode {
    constructor(private readonly host: string, private readonly user: string, private readonly password: string,
                private readonly port: string, private readonly database: string, private readonly column: any,
                private readonly tableName?: string, private readonly certPath?: string) {
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: `${this.column.COLUMN_NAME} : ${this.column.COLUMN_TYPE}     \n${this.column.COLUMN_COMMENT}`,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: "column",
            iconPath: path.join(__filename, "..", "..", "..", "resources", this.column.COLUMN_KEY === "PRI" ? "b_primary.png" : "b_props.png"),
        };
    }

    public async getChildren(): Promise<INode[]> {
        return [];
    }

    public getColumnName(): string {
        return this.column.COLUMN_NAME;
    }

    public getColumn() {
        return this.column;
    }

    public getTableName(): string {
        return this.tableName || "";
    }

    public async selectColumn() {
        AppInsightsClient.sendEvent("selectColumn");
        if (!this.tableName) {
            vscode.window.showWarningMessage("Table name not available");
            return;
        }

        const columnName = this.column.COLUMN_NAME;
        const query = `SELECT \`${columnName}\`\nFROM \`${this.database}\`.\`${this.tableName}\`\nLIMIT 1000;`;

        const connectionOptions = {
            host: this.host,
            user: this.user,
            password: this.password,
            port: this.port,
            database: this.database,
            certPath: this.certPath || "",
        };

        await Utility.runQuery(query, connectionOptions);
    }

    public async selectFilter() {
        AppInsightsClient.sendEvent("selectFilter");
        if (!this.tableName) {
            vscode.window.showWarningMessage("Table name not available");
            return;
        }

        const columnName = this.column.COLUMN_NAME;
        const columnType = this.column.COLUMN_TYPE || "";

        // Prompt user for filter value
        const filterValue = await vscode.window.showInputBox({
            prompt: `Enter filter value for column '${columnName}' (type: ${columnType})`,
            placeHolder: "filter value",
            ignoreFocusOut: true
        });

        if (filterValue === undefined) {
            // User cancelled
            return;
        }

        // Build WHERE clause based on column type
        let whereClause: string;
        const lowerType = columnType.toLowerCase();

        // Check if it's a numeric type
        const isNumeric = lowerType.includes("int") || lowerType.includes("decimal") ||
                         lowerType.includes("float") || lowerType.includes("double") ||
                         lowerType.includes("numeric") || lowerType.includes("bit");

        if (isNumeric) {
            // For numeric types, don't add quotes
            whereClause = `\`${columnName}\` = ${filterValue}`;
        } else {
            // For string types, add quotes and escape single quotes
            const escapedValue = filterValue.replace(/'/g, "''");
            whereClause = `\`${columnName}\` = '${escapedValue}'`;
        }

        const query = `SELECT *\nFROM \`${this.database}\`.\`${this.tableName}\`\nWHERE ${whereClause}\nLIMIT 1000;`;

        const connectionOptions = {
            host: this.host,
            user: this.user,
            password: this.password,
            port: this.port,
            database: this.database,
            certPath: this.certPath || "",
        };

        await Utility.runQuery(query, connectionOptions);
    }

    public async dropColumn() {
        AppInsightsClient.sendEvent("dropColumn");
        if (!this.tableName) {
            vscode.window.showWarningMessage("Table name not available");
            return;
        }

        const columnName = this.column.COLUMN_NAME;

        // Generate DROP COLUMN SQL
        const sql = `ALTER TABLE \`${this.database}\`.\`${this.tableName}\`\nDROP COLUMN \`${columnName}\`;`;

        // Create SQL document with the generated statement
        await Utility.createSQLTextDocument(sql);
    }
}
