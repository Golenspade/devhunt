#!/usr/bin/env bun

/**
 * 安全测试脚本：测试参数解析的安全性和边界情况
 * 
 * 测试场景：
 * 1. 数组越界：参数值缺失的情况
 * 2. 类型验证：无效的 lang/style 值
 * 3. 路径遍历：login 参数包含特殊字符
 * 4. 未验证的 window 值
 * 5. 时区注入：无效的 tz 格式
 * 6. 重复参数：多次提供同一参数
 * 7. 未知参数：未定义的参数
 */

import { parseArgs } from "./src/cli";
import { resolveSince } from "./src/timeWindow";

// 简化日志：不再发送外部请求，仅在控制台输出
function log(level: string, testCase: string, message: string, data: any) {
  console.debug(`[${level}] ${testCase}: ${message}`, data);
}

// #region agent log
log('INFO', 'TEST_START', '开始安全测试', { timestamp: Date.now() });
// #endregion

// 测试用例 0: 正常情况（应该成功）
console.log("\n=== 测试 0: 正常情况（应该成功）===");
try {
  const argv0 = ["scan", "torvalds", "--token", "ghp_test123", "--window", "year", "--yes"];
  // #region agent log
  log('TEST', 'NORMAL_CASE', '测试正常情况', { argv: argv0 });
  // #endregion
  const result0 = parseArgs(argv0);
  // #region agent log
  log('RESULT', 'NORMAL_CASE', '解析结果', { 
    cmd: result0.cmd,
    login: result0.login,
    token: result0.options.token,
    window: result0.options.window,
    yes: result0.options.yes
  });
  // #endregion
  console.log("✅ 通过: 正常情况解析成功");
  console.log("结果:", result0);
} catch (err) {
  // #region agent log
  log('ERROR', 'NORMAL_CASE', '不应该抛出异常', { error: String(err), isExpected: false });
  // #endregion
  console.error("❌ 失败: 正常情况不应该抛出错误:", err);
}

// 测试用例 1: 数组越界 - token 参数值缺失（应该抛出错误）
console.log("\n=== 测试 1: 数组越界 - token 参数值缺失（应该抛出错误）===");
try {
  const argv1 = ["scan", "user", "--token"];
  // #region agent log
  log('TEST', 'ARRAY_BOUNDS_TOKEN', '测试 token 参数值缺失', { argv: argv1 });
  // #endregion
  const result1 = parseArgs(argv1);
  // #region agent log
  log('RESULT', 'ARRAY_BOUNDS_TOKEN', '解析结果（不应该到达这里）', { 
    token: result1.options.token
  });
  // #endregion
  console.log("❌ 失败: 应该抛出错误但没有抛出");
  console.log("结果:", result1);
} catch (err) {
  // #region agent log
  log('ERROR', 'ARRAY_BOUNDS_TOKEN', '正确抛出异常', { error: String(err), isExpected: true });
  // #endregion
  console.log("✅ 通过: 正确抛出错误:", err);
}

// 测试用例 2: 数组越界 - window 参数值缺失（应该抛出错误）
console.log("\n=== 测试 2: 数组越界 - window 参数值缺失（应该抛出错误）===");
try {
  const argv2 = ["scan", "user", "--window"];
  // #region agent log
  log('TEST', 'ARRAY_BOUNDS_WINDOW', '测试 window 参数值缺失', { argv: argv2 });
  // #endregion
  const result2 = parseArgs(argv2);
  // #region agent log
  log('RESULT', 'ARRAY_BOUNDS_WINDOW', '解析结果（不应该到达这里）', { 
    window: result2.options.window
  });
  // #endregion
  console.log("❌ 失败: 应该抛出错误但没有抛出");
  console.log("结果:", result2);
} catch (err) {
  // #region agent log
  log('ERROR', 'ARRAY_BOUNDS_WINDOW', '正确抛出异常', { error: String(err), isExpected: true });
  // #endregion
  console.log("✅ 通过: 正确抛出错误:", err);
}

// 测试用例 3: 类型验证缺失 - 无效的 lang 值（应该抛出错误）
console.log("\n=== 测试 3: 类型验证缺失 - 无效的 lang 值（应该抛出错误）===");
try {
  const argv3 = ["narrate", "user", "--lang", "invalid"];
  // #region agent log
  log('TEST', 'INVALID_LANG', '测试无效的 lang 值', { argv: argv3 });
  // #endregion
  const result3 = parseArgs(argv3);
  // #region agent log
  log('RESULT', 'INVALID_LANG', '解析结果（不应该到达这里）', { 
    lang: result3.options.lang
  });
  // #endregion
  console.log("❌ 失败: 应该抛出错误但没有抛出");
  console.log("结果:", result3);
} catch (err) {
  // #region agent log
  log('ERROR', 'INVALID_LANG', '正确抛出异常', { error: String(err), isExpected: true });
  // #endregion
  console.log("✅ 通过: 正确抛出错误:", err);
}

// 测试用例 4: 类型验证缺失 - 无效的 style 值（应该抛出错误）
console.log("\n=== 测试 4: 类型验证缺失 - 无效的 style 值（应该抛出错误）===");
try {
  const argv4 = ["narrate", "user", "--style", "invalid"];
  // #region agent log
  log('TEST', 'INVALID_STYLE', '测试无效的 style 值', { argv: argv4 });
  // #endregion
  const result4 = parseArgs(argv4);
  // #region agent log
  log('RESULT', 'INVALID_STYLE', '解析结果（不应该到达这里）', { 
    style: result4.options.style
  });
  // #endregion
  console.log("❌ 失败: 应该抛出错误但没有抛出");
  console.log("结果:", result4);
} catch (err) {
  // #region agent log
  log('ERROR', 'INVALID_STYLE', '正确抛出异常', { error: String(err), isExpected: true });
  // #endregion
  console.log("✅ 通过: 正确抛出错误:", err);
}

// 测试用例 5: 路径遍历 - login 包含特殊字符（应该抛出错误）
console.log("\n=== 测试 5: 路径遍历 - login 包含特殊字符（应该抛出错误）===");
const dangerousLogins = ["../", "../../etc/passwd", "user/../admin", "user\\..\\admin"];
for (const login of dangerousLogins) {
  try {
    const argv5 = ["scan", login, "--token", "test"];
    // #region agent log
    log('TEST', 'PATH_TRAVERSAL', '测试路径遍历', { login, argv: argv5 });
    // #endregion
    const result5 = parseArgs(argv5);
    // #region agent log
    log('RESULT', 'PATH_TRAVERSAL', '解析结果（不应该到达这里）', { 
      login: result5.login
    });
    // #endregion
    console.log(`❌ 失败 (login: ${login}): 应该抛出错误但没有抛出`);
  } catch (err) {
    // #region agent log
    log('ERROR', 'PATH_TRAVERSAL', '正确抛出异常', { login, error: String(err), isExpected: true });
    // #endregion
    console.log(`✅ 通过 (login: ${login}): 正确抛出错误`);
  }
}

// 测试用例 6: 未验证的 window 值（应该抛出错误）
console.log("\n=== 测试 6: 未验证的 window 值（应该抛出错误）===");
const invalidWindows = ["invalid", "hack", "'; DROP TABLE--", "year' OR '1'='1"];
for (const window of invalidWindows) {
  try {
    const argv6 = ["scan", "user", "--window", window];
    // #region agent log
    log('TEST', 'INVALID_WINDOW', '测试无效的 window 值', { window, argv: argv6 });
    // #endregion
    const result6 = parseArgs(argv6);
    // #region agent log
    log('RESULT', 'INVALID_WINDOW', '解析结果（不应该到达这里）', { 
      window: result6.options.window
    });
    // #endregion
    console.log(`❌ 失败 (window: ${window}): 应该抛出错误但没有抛出`);
  } catch (err) {
    // #region agent log
    log('ERROR', 'INVALID_WINDOW', '正确抛出异常', { window, error: String(err), isExpected: true });
    // #endregion
    console.log(`✅ 通过 (window: ${window}): 正确抛出错误`);
  }
}

// 测试用例 7: 时区注入 - 无效的 tz 格式（应该抛出错误）
console.log("\n=== 测试 7: 时区注入 - 无效的 tz 格式（应该抛出错误）===");
const invalidTzs = ["'; DROP TABLE--", "../../etc/passwd", "Asia/Shanghai'; DROP TABLE--"];
for (const tz of invalidTzs) {
  try {
    const argv7 = ["report", "user", "--tz", tz];
    // #region agent log
    log('TEST', 'INVALID_TZ', '测试无效的 tz 值', { tz, argv: argv7 });
    // #endregion
    const result7 = parseArgs(argv7);
    // #region agent log
    log('RESULT', 'INVALID_TZ', '解析结果（不应该到达这里）', { 
      tz: result7.options.tz
    });
    // #endregion
    console.log(`❌ 失败 (tz: ${tz}): 应该抛出错误但没有抛出`);
  } catch (err) {
    // #region agent log
    log('ERROR', 'INVALID_TZ', '正确抛出异常', { tz, error: String(err), isExpected: true });
    // #endregion
    console.log(`✅ 通过 (tz: ${tz}): 正确抛出错误`);
  }
}

// 测试用例 8: 重复参数
console.log("\n=== 测试 8: 重复参数 ===");
try {
  const argv8 = ["scan", "user", "--token", "token1", "--token", "token2"];
  // #region agent log
  log('TEST', 'DUPLICATE_PARAMS', '测试重复参数', { argv: argv8 });
  // #endregion
  const result8 = parseArgs(argv8);
  // #region agent log
  log('RESULT', 'DUPLICATE_PARAMS', '解析结果', { 
    token: result8.options.token,
    isLastValue: result8.options.token === 'token2'
  });
  // #endregion
  console.log("结果:", result8);
  console.log("token 值:", result8.options.token);
  console.log("问题: 重复参数时，后面的值覆盖前面的值，没有警告");
} catch (err) {
  // #region agent log
  log('ERROR', 'DUPLICATE_PARAMS', '抛出异常', { error: String(err) });
  // #endregion
  console.error("错误:", err);
}

// 测试用例 9: 未知参数
console.log("\n=== 测试 9: 未知参数 ===");
try {
  const argv9 = ["scan", "user", "--unknown", "value", "--token", "test"];
  // #region agent log
  log('TEST', 'UNKNOWN_PARAMS', '测试未知参数', { argv: argv9 });
  // #endregion
  const result9 = parseArgs(argv9);
  // #region agent log
  log('RESULT', 'UNKNOWN_PARAMS', '解析结果', { 
    token: result9.options.token,
    hasUnknownParam: argv9.includes('--unknown')
  });
  // #endregion
  console.log("结果:", result9);
  console.log("问题: 未知参数被忽略，没有警告");
} catch (err) {
  // #region agent log
  log('ERROR', 'UNKNOWN_PARAMS', '抛出异常', { error: String(err) });
  // #endregion
  console.error("错误:", err);
}

// 测试用例 10: 空字符串参数值（应该抛出错误）
console.log("\n=== 测试 10: 空字符串参数值（应该抛出错误）===");
try {
  const argv10 = ["scan", "user", "--token", "", "--window", ""];
  // #region agent log
  log('TEST', 'EMPTY_VALUES', '测试空字符串参数值', { argv: argv10 });
  // #endregion
  const result10 = parseArgs(argv10);
  // #region agent log
  log('RESULT', 'EMPTY_VALUES', '解析结果（不应该到达这里）', { 
    token: result10.options.token,
    window: result10.options.window
  });
  // #endregion
  console.log("❌ 失败: 应该抛出错误但没有抛出");
  console.log("结果:", result10);
} catch (err) {
  // #region agent log
  log('ERROR', 'EMPTY_VALUES', '正确抛出异常', { error: String(err), isExpected: true });
  // #endregion
  console.log("✅ 通过: 正确抛出错误:", err);
}

// 测试用例 11: 参数值包含等号（可能被误解析）
console.log("\n=== 测试 11: 参数值包含等号 ===");
try {
  const argv11 = ["scan", "user", "--token", "token=value", "--tz", "Asia/Shanghai=test"];
  // #region agent log
  log('TEST', 'EQUALS_IN_VALUE', '测试参数值包含等号', { argv: argv11 });
  // #endregion
  const result11 = parseArgs(argv11);
  // #region agent log
  log('RESULT', 'EQUALS_IN_VALUE', '解析结果', { 
    token: result11.options.token,
    tz: result11.options.tz
  });
  // #endregion
  console.log("结果:", result11);
  console.log("token 值:", result11.options.token);
  console.log("tz 值:", result11.options.tz);
} catch (err) {
  // #region agent log
  log('ERROR', 'EQUALS_IN_VALUE', '抛出异常', { error: String(err) });
  // #endregion
  console.error("错误:", err);
}

// #region agent log
log('INFO', 'TEST_END', '安全测试完成', { timestamp: Date.now() });
// #endregion

console.log("\n=== 安全测试完成 ===");

