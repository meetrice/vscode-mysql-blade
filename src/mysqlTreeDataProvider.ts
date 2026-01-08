import * as path from "path";
import * as uuidv1 from "uuid/v1";
import * as vscode from "vscode";
import { AppInsightsClient } from "./common/appInsightsClient";
import { Constants } from "./common/constants";
import { Global } from "./common/global";
import { IConnection } from "./model/connection";
import { ConnectionNode } from "./model/connectionNode";
import { INode } from "./model/INode";

const PINNED_TABLES_KEY = "mysql.pinnedTables";

export class MySQLTreeDataProvider implements vscode.TreeDataProvider<INode> {
    public _onDidChangeTreeData: vscode.EventEmitter<INode> = new vscode.EventEmitter<INode>();
    public readonly onDidChangeTreeData: vscode.Event<INode> = this._onDidChangeTreeData.event;

    constructor(private context: vscode.ExtensionContext) {
    }

    public getTreeItem(element: INode): Promise<vscode.TreeItem> | vscode.TreeItem {
        return element.getTreeItem();
    }

    public getChildren(element?: INode): Thenable<INode[]> | INode[] {
        if (!element) {
            return this.getConnectionNodes();
        }

        return element.getChildren();
    }

    public getPinnedTables(): string[] {
        return this.context.globalState.get<string[]>(PINNED_TABLES_KEY, []);
    }

    public async addPinnedTable(tableKey: string): Promise<void> {
        const pinnedTables = this.getPinnedTables();
        if (pinnedTables.indexOf(tableKey) < 0) {
            pinnedTables.push(tableKey);
            await this.context.globalState.update(PINNED_TABLES_KEY, pinnedTables);
        }
    }

    public async removePinnedTable(tableKey: string): Promise<void> {
        const pinnedTables = this.getPinnedTables();
        const index = pinnedTables.indexOf(tableKey);
        if (index >= 0) {
            pinnedTables.splice(index, 1);
            await this.context.globalState.update(PINNED_TABLES_KEY, pinnedTables);
        }
    }

    public async addConnection() {
        AppInsightsClient.sendEvent("addConnection.start");
        const displayName = await vscode.window.showInputBox({ prompt: "Display name for this connection", placeHolder: "My MySQL Server", ignoreFocusOut: true });
        if (displayName === undefined) {
            return;
        }

        const host = await vscode.window.showInputBox({ prompt: "The hostname of the database", placeHolder: "host", ignoreFocusOut: true });
        if (!host) {
            return;
        }

        const user = await vscode.window.showInputBox({ prompt: "The MySQL user to authenticate as", placeHolder: "user", ignoreFocusOut: true });
        if (!user) {
            return;
        }

        const password = await vscode.window.showInputBox({ prompt: "The password of the MySQL user", placeHolder: "password", ignoreFocusOut: true, password: true });
        if (password === undefined) {
            return;
        }

        const port = await vscode.window.showInputBox({ prompt: "The port number to connect to", placeHolder: "port", ignoreFocusOut: true, value: "3306" });
        if (!port) {
            return;
        }

        const certPath = await vscode.window.showInputBox({ prompt: "[Optional] SSL certificate path. Leave empty to ignore", placeHolder: "certificate file path", ignoreFocusOut: true });
        if (certPath === undefined) {
            return;
        }

        let connections = this.context.globalState.get<{ [key: string]: IConnection }>(Constants.GlobalStateMySQLConectionsKey);

        if (!connections) {
            connections = {};
        }

        const id = uuidv1();
        connections[id] = {
            host,
            user,
            port,
            certPath,
            displayName,
        };

        if (password) {
            await Global.secrets.store(id, password);
        }
        await this.context.globalState.update(Constants.GlobalStateMySQLConectionsKey, connections);
        this.refresh();
        AppInsightsClient.sendEvent("addConnection.end");
    }

    public refresh(element?: INode): void {
        this._onDidChangeTreeData.fire(element);
    }

    private async getConnectionNodes(): Promise<ConnectionNode[]> {
        const connections = this.context.globalState.get<{ [key: string]: IConnection }>(Constants.GlobalStateMySQLConectionsKey);
        const ConnectionNodes = [];
        if (connections) {
            for (const id of Object.keys(connections)) {
                const password = await Global.secrets.get(id);
                ConnectionNodes.push(new ConnectionNode(id, connections[id].host, connections[id].user, password, connections[id].port, connections[id].certPath, connections[id].displayName || connections[id].host, this));
                if (!Global.activeConnection) {
                    Global.activeConnection = {
                        host: connections[id].host,
                        user: connections[id].user,
                        password,
                        port: connections[id].port,
                        certPath: connections[id].certPath,
                    };
                }
            }
        }
        return ConnectionNodes;
    }
}
