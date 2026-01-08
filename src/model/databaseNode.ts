import * as fs from "fs";
import * as mysql from "mysql";
import * as path from "path";
import * as vscode from "vscode";
import { AppInsightsClient } from "../common/appInsightsClient";
import { Global } from "../common/global";
import { Utility } from "../common/utility";
import { InfoNode } from "./infoNode";
import { INode } from "./INode";
import { TableNode } from "./tableNode";
import { MySQLTreeDataProvider } from "../mysqlTreeDataProvider";

export class DatabaseNode implements INode {
    constructor(private readonly host: string, private readonly user: string,
                private readonly password: string, private readonly port: string, private readonly database: string,
                private readonly certPath: string,
                private treeDataProvider?: MySQLTreeDataProvider) {
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.database,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: "database",
            iconPath: path.join(__filename, "..", "..", "..", "resources", "database.svg"),
        };
    }

    public async getChildren(): Promise<INode[]> {
        const connection = Utility.createConnection({
            host: this.host,
            user: this.user,
            password: this.password,
            port: this.port,
            database: this.database,
            certPath: this.certPath,
        });

        return Utility.queryPromise<any[]>(connection, `SELECT TABLE_NAME FROM information_schema.TABLES  WHERE TABLE_SCHEMA = '${this.database}' LIMIT ${Utility.maxTableCount}`)
            .then((tables) => {
                // Get pinned tables from global state
                const pinnedTables: string[] = this.treeDataProvider ? this.treeDataProvider.getPinnedTables() : [];

                const tableNodes = tables.map<TableNode>((table) => {
                    const tableKey = `${this.host}:${this.port}:${this.database}:${table.TABLE_NAME}`;
                    const isPinned = pinnedTables.indexOf(tableKey) >= 0;
                    return new TableNode(this.host, this.user, this.password, this.port, this.database, table.TABLE_NAME, this.certPath, isPinned, this.treeDataProvider);
                });

                // Sort: pinned tables first (in order of pinning), then alphabetical
                tableNodes.sort((a, b) => {
                    if (a.pinned && !b.pinned) return -1;
                    if (!a.pinned && b.pinned) return 1;
                    if (a.pinned && b.pinned) {
                        // Sort by pin order
                        const aIndex = pinnedTables.indexOf(a.getKey());
                        const bIndex = pinnedTables.indexOf(b.getKey());
                        return aIndex - bIndex;
                    }
                    // Both not pinned, sort alphabetically
                    return a.table.localeCompare(b.table);
                });

                return tableNodes;
            })
            .catch((err) => {
                return [new InfoNode(err)];
            });
    }

    public async newQuery() {
        AppInsightsClient.sendEvent("newQuery", { viewItem: "database" });
        Utility.createSQLTextDocument();

        Global.activeConnection = {
            host: this.host,
            user: this.user,
            password: this.password,
            port: this.port,
            database: this.database,
            certPath: this.certPath,
        };
    }

    public async selectDatabase() {
        AppInsightsClient.sendEvent("selectDatabase", { viewItem: "database" });

        Global.activeConnection = {
            host: this.host,
            user: this.user,
            password: this.password,
            port: this.port,
            database: this.database,
            certPath: this.certPath,
        };

        vscode.window.showInformationMessage(`Database selected: ${this.database}`);
    }

    public async refresh() {
        if (this.treeDataProvider) {
            this.treeDataProvider.refresh(this);
        }
    }
}
