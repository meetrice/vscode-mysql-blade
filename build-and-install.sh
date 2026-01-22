#!/bin/bash
# 编译、打包、安装 VSCode 插件脚本
#npm run compile && npx vsce package && code --install-extension mysql-blade-0.5.5.vsix --force
set -e  # 遇到错误时退出

echo "========================================="
echo "0. 卸载旧版本插件..."
echo "========================================="
# 卸载可能存在的旧版本 code --uninstall-extension meetrice.vscode-mysql
code --list-extensions | grep -i mysql | while read ext; do
    echo "正在卸载: $ext"
    code --uninstall-extension "$ext" 2>/dev/null || true
done
echo "旧版本插件卸载完成"

echo ""
echo "========================================="
echo "1. 编译 TypeScript..."
echo "========================================="
npm run compile

echo ""
echo "========================================="
echo "2. 打包生成 VSIX..."
echo "========================================="
npx vsce package

echo ""
echo "========================================="
echo "3. 安装扩展..."
echo "========================================="
# 查找生成的 vsix 文件
VSIX_FILE=$(ls -t vscode-mysql-*.vsix 2>/dev/null | head -1)

if [ -z "$VSIX_FILE" ]; then
    echo "错误: 未找到 VSIX 文件"
    exit 1
fi

echo "找到 VSIX 文件: $VSIX_FILE"
code --install-extension "$VSIX_FILE" --force

echo ""
echo "========================================="
echo "✅ 完成! 请重新加载 VSCode 窗口以使用更新后的扩展"
echo "========================================="
