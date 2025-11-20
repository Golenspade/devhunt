# devhunt

GitHub 开发者画像工具 MVP（基于 Bun + TypeScript + GitHub GraphQL）。

> 当前版本：**0.0.14**（pround.normal.shame）

---

## 使用概览

devhunt 提供两个核心子命令：

- `scan`   扫描指定 GitHub 用户，拉取仓库 / PR / commit 等原始数据并写入 `out/<login>/raw/`。
- `report`  基于原始数据生成画像 JSON 和图表（`out/<login>/profile.json`、`charts/*.svg` 等）。

详细命令行参数（如 `--token`、`--window`、`--tz`）请见：

- [`docs/cli-params.md`](./docs/cli-params.md)

---

## 项目状态

- 当前仍处于早期 MVP 阶段，重点验证「从 GitHub 公共数据构建行为画像」的可行性。
- 扩展方向包含：更细粒度的 commit/issue 分析、贡献度度量、长程行为轨迹等。

