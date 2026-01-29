# 🚀 GitHub推送指南

Boss，请按以下步骤推送代码到GitHub：

## 方式1：使用HTTPS推送

```bash
cd /Users/laixiang/clawd/money-making

# 推送代码（会提示输入GitHub用户名和密码/token）
git push -u origin main
```

**如果提示输入密码：**
- 不能使用GitHub登录密码
- 需要使用Personal Access Token

**创建Token步骤：**
1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token" → "Generate new token (classic)"
3. 勾选权限：
   - ✅ repo（完整仓库权限）
   - ✅ workflow（GitHub Actions）
4. 点击 "Generate token"
5. 复制生成的token（只显示一次）
6. 推送时用token作为密码

## 方式2：使用SSH推送（推荐）

### 1. 生成SSH密钥
```bash
ssh-keygen -t ed25519 -C "laishao@github.com"
```

### 2. 启动SSH代理
```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

### 3. 复制公钥
```bash
cat ~/.ssh/id_ed25519.pub
```

### 4. 添加到GitHub
1. 访问 https://github.com/settings/keys
2. 点击 "New SSH key"
3. 粘贴公钥内容
4. 点击 "Add SSH key"

### 5. 修改远程仓库地址为SSH
```bash
cd /Users/laixiang/clawd/money-making
git remote set-url origin git@github.com:laishao/code-quality-scanner.git
git push -u origin main
```

## 推送成功后

告诉我推送成功，我将立即：
1. 在掘金发布技术文章
2. 在知乎发布讨论帖
3. 在V2EX发布分享帖
4. 在小红书发布推广帖
5. 开始获取第一个付费订单！

---

**准备好了吗？开始推送吧！** 🚀
