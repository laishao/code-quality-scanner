#!/usr/bin/env node

/**
 * 🤖 贾维斯代码质量检测器
 * 快速发现JavaScript/TypeScript/Vue项目中的常见问题
 *
 * 使用方法:
 *   node code-quality-scanner.js [目标目录]
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  // 支持的文件扩展名
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue'],
  // 最大代码行长度
  maxLineLength: 120
};

// 扫描规则（需要在CONFIG定义之后定义）
CONFIG.rules = {
    // 严重问题
    critical: [
      {
        name: 'SQL注入风险',
        regex: /db\.query\(.*?\$\{[^}]+\}.*?\)|db\.query\(.*?\+.*?\)|db\.execute\(.*?\$\{[^}]+\}.*?\)/gi,
        description: '直接拼接SQL语句，存在SQL注入风险'
      },
      {
        name: 'XSS漏洞风险',
        regex: /v-html\s*=\s*["'].*?["']|innerHTML\s*=|\.insertAdjacentHTML\(/gi,
        description: '直接使用v-html或innerHTML，存在XSS风险'
      },
      {
        name: '敏感信息存储在localStorage',
        regex: /localStorage\.(setItem|getItem)\(['"](password|token|secret|api[_-]?key)['"]/gi,
        description: '敏感信息不应存储在localStorage，应使用sessionStorage或加密存储'
      },
      {
        name: '硬编码密钥',
        regex: /['"](?:sk-|pk-|api[_-]?key|secret|password)['"]\s*:\s*['"][a-zA-Z0-9_\-]{20,}['"]/gi,
        description: '代码中包含硬编码的密钥或密码'
      }
    ],
    // 警告问题
    warning: [
      {
        name: '生产环境console日志',
        regex: /console\.(log|debug|info|warn|error|table|trace)\s*\(/gi,
        description: '生产环境不应包含console日志'
      },
      {
        name: '使用var声明变量',
        regex: /\bvar\s+[a-zA-Z_]\w*\s*[=;]/g,
        description: '建议使用const/let代替var'
      },
      {
        name: '空catch块',
        regex: /catch\s*\([^)]*\)\s*\{\s*\}/g,
        description: 'catch块不应为空，至少记录错误'
      }
    ],
    // 提示问题
    info: [
      {
        name: '未完成的TODO注释',
        regex: /\/\/\s*TODO|\/\*\s*TODO|\*TODO/gi,
        description: '存在未完成的TODO注释'
      },
      {
        name: '过长的代码行',
        check: (line) => line.length > CONFIG.maxLineLength,
        description: `代码行超过${CONFIG.maxLineLength}字符`
      }
    ]
};

// 扫描结果
let scanResults = {
  totalFiles: 0,
  scannedFiles: 0,
  issues: {
    critical: [],
    warning: [],
    info: []
  }
};

/**
 * 扫描单个文件
 */
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    scanResults.scannedFiles++;

    // 扫描严重问题
    CONFIG.rules.critical.forEach(rule => {
      lines.forEach((line, index) => {
        const matches = line.match(rule.regex);
        if (matches) {
          matches.forEach(match => {
            scanResults.issues.critical.push({
              file: filePath,
              line: index + 1,
              rule: rule.name,
              description: rule.description,
              code: line.trim().substring(0, 80)
            });
          });
        }
      });
    });

    // 扫描警告问题
    CONFIG.rules.warning.forEach(rule => {
      lines.forEach((line, index) => {
        const matches = line.match(rule.regex);
        if (matches) {
          // 跳过包含注释的console
          if (!line.trim().startsWith('//')) {
            scanResults.issues.warning.push({
              file: filePath,
              line: index + 1,
              rule: rule.name,
              description: rule.description,
              code: line.trim().substring(0, 80)
            });
          }
        }
      });
    });

    // 扫描提示问题
    CONFIG.rules.info.forEach(rule => {
      lines.forEach((line, index) => {
        if (rule.check) {
          if (rule.check(line)) {
            scanResults.issues.info.push({
              file: filePath,
              line: index + 1,
              rule: rule.name,
              description: rule.description,
              code: line.trim().substring(0, 80)
            });
          }
        } else if (rule.regex) {
          const matches = line.match(rule.regex);
          if (matches) {
            scanResults.issues.info.push({
              file: filePath,
              line: index + 1,
              rule: rule.name,
              description: rule.description,
              code: line.trim().substring(0, 80)
            });
          }
        }
      });
    });

  } catch (error) {
    console.error(`扫描文件失败: ${filePath}`, error.message);
  }
}

/**
 * 递归扫描目录
 */
function scanDirectory(dir, relativePath = '') {
  try {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      // 跳过隐藏目录和node_modules
      if (file.startsWith('.') || file === 'node_modules' || file === 'dist' || file === 'build') {
        continue;
      }

      const fullPath = path.join(dir, file);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        scanDirectory(fullPath, path.join(relativePath, file));
      } else if (stats.isFile()) {
        const ext = path.extname(file);
        if (CONFIG.extensions.includes(ext)) {
          scanResults.totalFiles++;
          scanFile(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`扫描目录失败: ${dir}`, error.message);
  }
}

/**
 * 格式化输出
 */
function formatOutput() {
  const critical = scanResults.issues.critical;
  const warning = scanResults.issues.warning;
  const info = scanResults.issues.info;

  // 输出统计
  console.log('\n🔍 贾维斯代码质量检测报告');
  console.log('═══════════════════════════════════════\n');
  console.log('📊 扫描统计');
  console.log(`• 扫描文件数: ${scanResults.scannedFiles}`);
  console.log(`• 发现问题数: ${critical.length + warning.length + info.length}`);
  console.log(`• 🔴 严重问题: ${critical.length}`);
  console.log(`• 🟠 警告问题: ${warning.length}`);
  console.log(`• 🟡 提示问题: ${info.length}`);

  // 输出严重问题
  if (critical.length > 0) {
    console.log('\n📋 严重问题详情');
    console.log('═══════════════════════════════════════\n');
    console.log(`🔴 严重问题 (${critical.length}个)`);
    critical.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue.rule}`);
      console.log(`     📁 ${relativePath(issue.file)}:${issue.line}`);
      console.log(`     💻 ${issue.code}...`);
      console.log(`     ⚠️ ${issue.description}\n`);
    });
  }

  // 输出警告问题（最多显示10个）
  if (warning.length > 0) {
    console.log(`🟠 警告问题 (${warning.length}个)`);
    const displayWarning = warning.slice(0, 10);
    displayWarning.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue.rule}`);
      console.log(`     📁 ${relativePath(issue.file)}:${issue.line}`);
      if (index === 0) {
        console.log(`     💻 ${issue.code}...`);
      }
    });
    if (warning.length > 10) {
      console.log(`     ... 还有 ${warning.length - 10} 个警告问题`);
    }
    console.log('');
  }

  // 输出提示问题（最多显示5个）
  if (info.length > 0) {
    console.log(`🟡 提示问题 (${info.length}个)`);
    const displayInfo = info.slice(0, 5);
    displayInfo.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue.rule}`);
      console.log(`     📁 ${relativePath(issue.file)}:${issue.line}`);
      if (index === 0) {
        console.log(`     💻 ${issue.code}...`);
      }
    });
    if (info.length > 5) {
      console.log(`     ... 还有 ${info.length - 5} 个提示问题`);
    }
    console.log('');
  }

  // 输出联系信息
  console.log('═══════════════════════════════════════');
  console.log('💡 需要深度代码审查？');
  console.log('   联系贾维斯: +8613632593811 (iMessage)');
  console.log('   微信: xiang_lai\n');
}

/**
 * 转换为相对路径
 */
function relativePath(filePath) {
  return filePath.replace(process.cwd() + '/', '');
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 开始扫描...\n');

  const startTime = Date.now();
  let targetDir = process.argv[2] || '.';

  // 如果是相对路径，转换为绝对路径
  if (!path.isAbsolute(targetDir)) {
    targetDir = path.join(process.cwd(), targetDir);
  }

  if (!fs.existsSync(targetDir)) {
    console.error('❌ 目标目录不存在:', targetDir);
    process.exit(1);
  }

  scanDirectory(targetDir);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ 扫描完成！耗时 ${duration} 秒\n`);

  formatOutput();
}

// 运行
if (require.main === module) {
  main();
}

module.exports = { CONFIG, scanFile, scanDirectory };
