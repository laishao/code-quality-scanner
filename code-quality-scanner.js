#!/usr/bin/env node
/**
 * 贾维斯代码质量检测器 v1.0
 * 快速扫描代码中的常见问题
 * 由AI助手贾维斯开发
 */

const fs = require('fs');
const path = require('path');

// 问题类型定义
const ISSUE_TYPES = {
  CRITICAL: { level: 'critical', emoji: '🔴', color: 'red' },
  WARNING: { level: 'warning', emoji: '🟠', color: 'yellow' },
  INFO: { level: 'info', emoji: '🟡', color: 'blue' }
};

// 常见问题模式
const PATTERNS = {
  // 安全问题
  sqlInjection: {
    type: ISSUE_TYPES.CRITICAL,
    patterns: [
      /SELECT.*FROM.*\$\{.*\}/gi,
      /query\(`.*\$\{.*}\`\)/gi,
      /execute\(`.*\$\{.*}\`\)/gi
    ],
    message: '潜在的SQL注入漏洞'
  },

  xss: {
    type: ISSUE_TYPES.CRITICAL,
    patterns: [
      /innerHTML.*\$\{.*\}/gi,
      /dangerouslySetInnerHTML/gi,
      /document\.write\(/gi
    ],
    message: '潜在的XSS（跨站脚本）漏洞'
  },

  localStorageSensitive: {
    type: ISSUE_TYPES.CRITICAL,
    patterns: [
      /localStorage\.(setItem|getItem)\(['"](password|token|secret|key)/gi
    ],
    message: '敏感信息存储在localStorage，应使用sessionStorage'
  },

  // 性能问题
  consoleLog: {
    type: ISSUE_TYPES.WARNING,
    patterns: [
      /console\.(log|debug|info|warn|error)\(/gi
    ],
    message: '生产环境不应包含console日志'
  },

  varDeclaration: {
    type: ISSUE_TYPES.WARNING,
    patterns: [
      /\bvar\s+/g
    ],
    message: '建议使用const/let代替var'
  },

  // 代码质量问题
  todoComment: {
    type: ISSUE_TYPES.INFO,
    patterns: [
      /\/\/\s*TODO/gi,
      /\/\*\s*TODO/gi
    ],
    message: '未完成的TODO注释'
  },

  longLine: {
    type: ISSUE_TYPES.INFO,
    patterns: [
      /^.{120,}$/gm
    ],
    message: '代码行过长（超过120字符）'
  },

  emptyCatch: {
    type: ISSUE_TYPES.WARNING,
    patterns: [
      /catch\s*\(\s*\w+\s*\)\s*\{\s*\}/g
    ],
    message: '空的catch块，无法捕获错误信息'
  }
};

// 支持的文件扩展名
const SUPPORTED_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.vue'];

// 扫描文件
function scanFile(filePath) {
  if (!SUPPORTED_EXTENSIONS.includes(path.extname(filePath))) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const issues = [];

  for (const [name, config] of Object.entries(PATTERNS)) {
    for (const pattern of config.patterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        regex.lastIndex = 0;
        if (regex.test(line)) {
          issues.push({
            type: name,
            level: config.type.level,
            emoji: config.type.emoji,
            message: config.message,
            file: filePath,
            line: index + 1,
            code: line.trim()
          });
        }
      });
    }
  }

  return issues;
}

// 扫描目录
function scanDirectory(dirPath) {
  let issues = [];
  let filesScanned = 0;

  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // 跳过node_modules、.git等目录
        if (!['node_modules', '.git', 'dist', 'build', '.vscode'].includes(item)) {
          traverse(fullPath);
        }
      } else if (stat.isFile()) {
        const fileIssues = scanFile(fullPath);
        issues.push(...fileIssues);
        filesScanned++;
      }
    }
  }

  traverse(dirPath);
  return { issues, filesScanned };
}

// 统计问题
function summarizeIssues(issues) {
  const summary = {
    critical: 0,
    warning: 0,
    info: 0,
    byType: {}
  };

  for (const issue of issues) {
    if (issue.level === 'critical') summary.critical++;
    else if (issue.level === 'warning') summary.warning++;
    else summary.info++;

    if (!summary.byType[issue.type]) {
      summary.byType[issue.type] = 0;
    }
    summary.byType[issue.type]++;
  }

  return summary;
}

// 生成报告
function generateReport(issues, filesScanned, summary) {
  let report = `
🔍 贾维斯代码质量检测报告
═══════════════════════════════════════

📊 扫描统计
• 扫描文件数: ${filesScanned}
• 发现问题数: ${issues.length}
• 🔴 严重问题: ${summary.critical}
• 🟠 警告问题: ${summary.warning}
• 🟡 提示问题: ${summary.info}

`;

  if (issues.length > 0) {
    report += `\n📋 问题详情\n${'═'.repeat(50)}\n\n`;

    // 按严重程度分组
    const critical = issues.filter(i => i.level === 'critical');
    const warning = issues.filter(i => i.level === 'warning');
    const info = issues.filter(i => i.level === 'info');

    if (critical.length > 0) {
      report += `🔴 严重问题 (${critical.length}个)\n`;
      critical.slice(0, 5).forEach((issue, idx) => {
        report += `  ${idx + 1}. ${issue.message}\n`;
        report += `     📁 ${issue.file}:${issue.line}\n`;
        report += `     💻 ${issue.code.substring(0, 80)}...\n\n`;
      });
      if (critical.length > 5) {
        report += `     ... 还有 ${critical.length - 5} 个严重问题\n\n`;
      }
    }

    if (warning.length > 0) {
      report += `🟠 警告问题 (${warning.length}个)\n`;
      warning.slice(0, 3).forEach((issue, idx) => {
        report += `  ${idx + 1}. ${issue.message}\n`;
        report += `     📁 ${issue.file}:${issue.line}\n\n`;
      });
      if (warning.length > 3) {
        report += `     ... 还有 ${warning.length - 3} 个警告问题\n\n`;
      }
    }

    if (info.length > 0) {
      report += `🟡 提示问题 (${info.length}个)\n`;
      report += `   ${info.slice(0, 2).map(i => i.message).join(', ')}\n\n`;
    }
  }

  report += `
═══════════════════════════════════════

💡 需要深度代码审查？
   联系贾维斯: +8613632593811 (iMessage)
   微信: lai_xiang_2026
   邮件: jarvis@lai-xiang.com

✨ 深度审查包含：
   • 完整的安全漏洞扫描
   • 性能优化建议
   • 架构设计评估
   • 依赖库安全检查
   • 详细修复方案 + 代码示例

⏱️ 快速响应 • 精准定位 • 可执行建议
`;

  return report;
}

// 主函数
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
贾维斯代码质量检测器 v1.0

用法:
  node code-quality-scanner.js <项目路径>

示例:
  node code-quality-scanner.js ./my-project
  node code-quality-scanner.js /path/to/project

说明:
  自动扫描JavaScript/TypeScript/Vue项目中的常见问题
  包括安全漏洞、性能问题、代码质量问题
`);
    process.exit(1);
  }

  const projectPath = args[0];

  if (!fs.existsSync(projectPath)) {
    console.error(`❌ 错误: 目录不存在 - ${projectPath}`);
    process.exit(1);
  }

  console.log('🔍 正在扫描代码...\n');

  const startTime = Date.now();
  const { issues, filesScanned } = scanDirectory(projectPath);
  const summary = summarizeIssues(issues);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  const report = generateReport(issues, filesScanned, summary);

  console.log(report);

  // 保存报告到文件
  const reportPath = path.join(projectPath, 'code-quality-report.txt');
  fs.writeFileSync(reportPath, report);
  console.log(`📄 报告已保存到: ${reportPath}`);
  console.log(`⏱️  扫描耗时: ${duration}秒`);
}

// 运行
if (require.main === module) {
  main();
}

module.exports = { scanDirectory, scanFile, PATTERNS };
