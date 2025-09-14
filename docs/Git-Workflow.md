# Git 工作流程指南

## 分支策略

```
main (生产分支)
  ↓
develop (开发分支)
  ↓
feature/* (功能分支)
hotfix/* (紧急修复分支)
```

## 分支说明

- **main**: 生产环境分支，只包含稳定的发布版本
- **develop**: 开发分支，包含最新的开发功能
- **feature/***: 功能分支，用于开发新功能
- **hotfix/***: 紧急修复分支，用于修复生产环境问题

## 常用命令

### 基本操作
```bash
git st                 # 查看状态
git br                 # 查看分支
git co <branch>        # 切换分支
git cm "message"       # 提交代码
git lg                 # 查看提交历史
```

### 开发工作流
```bash
# 1. 从develop创建新功能分支
git co develop
git pull origin develop
git co -b feature/new-feature

# 2. 开发并提交
git add .
git cm "feat: add new feature"

# 3. 推送到远程
git push origin feature/new-feature

# 4. 创建Pull Request到develop分支
```

### 提交消息规范
```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建工具或辅助工具修改
```

## 当前分支状态

- ✅ **main**: 初始化完成
- ✅ **develop**: 开发分支已创建
- 🚧 **feature/canvas-improvements**: 当前工作分支

## 下一步计划

1. 在feature分支上继续开发
2. 完成功能后合并到develop
3. 测试稳定后合并到main
4. 打标签发布版本