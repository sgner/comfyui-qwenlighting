# ComfyQwenLighting

<div>
ComfyQwenLighting 是一个ComfyUI 自定义节点，允许你通过直观的3D球体可视化界面来调整光源位置、亮度和颜色，并自动生成高质量的自然语言提示词（Prompt）
</div>

---

![n-img](https://github.com/sgner/images/blob/main/%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE%202026-01-13%20221815.png)。
### 配合[多角度镜头节点](https://github.com/jtydhr88/ComfyUI-qwenmultiangle)，使用z-image-turbo文生图示例
![e-img](https://github.com/sgner/images/blob/main/result.jpeg)

### 核心特性

####  8种光源类型
- **阳光（方向光）** - 自然户外照明风格
- **柔光箱（面光源）** - 大型漫射光源，柔和的皮肤渐变
- **电影聚光灯** - 戏剧性聚焦光束，电影黑色风格
- **室内灯（灯泡）** - 温暖照明，舒适的室内氛围
- **环形灯（美颜灯）** - 平面照明，无阴影，美颜摄影风格
- **霓虹/赛博朋克** - 充满活力的合成照明，彩色氛围光
- **火焰/烛光** - 温暖闪烁光，动态橙色照明
- **体积光（上帝之光）** - 体积照明，丁达尔效应，光束穿透

####  精确的光照控制
- **方位角**：0° - 360°，360度全方位光源定位
- **俯仰角**：-90° - 90°，从正下方到正上方
- **亮度强度**：0.0 - 2.0，从完全黑暗到过度曝光
- **光照硬度**：0.0 - 1.0，从无阴影到硬阴影

####  智能颜色匹配
- 内置多种预设颜色
- 智能RGB空间颜色匹配算法
- 自动将十六进制颜色转换为自然语言描述
- 支持自定义颜色输入

####  实时3D可视化
- 交互式3D球体界面
- 实时光源位置预览
- 双向数据同步（3D视图 ↔ 控制面板）
- 直观的拖拽操作

#### 智能提示词生成
- 自动生成结构化的自然语言提示词
- 包含光源方向、类型、颜色、高度、质量和强度
- 优化用于AI图像生成模型
- 支持缓存机制提高性能
#### 自定义修改提示词
提示词配置在项目的lighting_maps.json文件中，无需修改代码即可替换为自己想要的提示词
### 安装指南

#### 方法一：通过 ComfyUI-Manager 安装（推荐）

1. 安装 [ComfyUI](https://docs.comfy.org/get_started)
2. 安装 [ComfyUI-Manager](https://github.com/ltdrdata/ComfyUI-Manager)
3. 在 ComfyUI-Manager 中搜索 "ComfyQwenLighting"
4. 点击安装并重启 ComfyUI

#### 方法二：手动安装

```bash
# 克隆仓库到 ComfyUI/custom_nodes 目录
cd ComfyUI/custom_nodes
git clone https://github.com/sgner/comfyui-qwenlighting.git

# 重启 ComfyUI
```

### 使用说明

#### 基本使用

1. 在 ComfyUI 中搜索并添加 **"Qwen Multiangle Lighting"** 节点
2. 使用3D可视化界面调整光源参数：
   - **拖拽球体**：改变光源的方位角和俯仰角
   - **选择光源类型**：从下拉菜单选择8种预设光源
   - **调整颜色**：使用颜色选择器或输入十六进制颜色值
   - **设置强度和硬度**：使用滑块调整参数
3. 节点会自动生成对应的提示词，可连接到文本编码器或其他节点

#### 参数说明

| 参数 | 类型 | 范围 | 说明 |
|------|------|------|------|
| Light Type | 下拉菜单 | 8种选项 | 光源类型选择 |
| Azimuth | 滑块 | 0-360° | 光源方位角（水平方向） |
| Elevation | 滑块 | -90-90° | 光源俯仰角（垂直方向） |
| Intensity | 滑块 | 0.0-2.0 | 光照强度 |
| Light Color | 颜色选择器 | 任意 | 光源颜色（十六进制） |
| Hardness | 滑块 | 0.0-1.0 | 阴影硬度 |

#### 输出说明

节点输出一个字符串类型的 **lighting_prompt**，包含完整的自然语言光照描述，例如：

```
off-screen light source, light source from front-right, natural illumination, outdoor lighting style, neutral white light, light source from high angle, hard shadows, well lit, optimal exposure, clear visibility, commercial standard
```

### 开发指南

#### 环境设置

```bash
# 克隆仓库
git clone https://github.com/sgner/comfyqwenlighting.git
cd comfyqwenlighting

# 安装开发依赖
pip install -e .[dev]

# 安装 pre-commit hooks
pre-commit install
```

`-e` 标志会创建一个"实时"安装，对节点扩展的任何更改都会在下次运行 ComfyUI 时自动生效。

#### 项目结构

```
comfyqwenlighting/
├── __init__.py           # 包初始化，导出节点类
├── nodes.py              # 核心节点实现
├── lighting_maps.json    # 光照映射配置（颜色、强度、方向等）
├── web/
│   └── js/
│       ├── qwen_lighting.js    # ComfyUI前端扩展
│       └── viewer_light.js      # 3D可视化HTML内容
├── tests/                # 单元测试
├── .github/              # GitHub Actions工作流
└── pyproject.toml        # 项目配置
```

#### 运行测试

```bash
# 运行所有测试
pytest

# 运行测试并生成覆盖率报告
pytest --cov=. --cov-report=html
```

#### 代码规范

项目使用以下工具进行代码质量检查：
- **Ruff** - Python代码检查和格式化
- **MyPy** - 静态类型检查
- **Pre-commit** - 提交前自动检查

### 发布到GitHub

1. 创建一个与目录名称匹配的GitHub仓库
2. 推送文件到Git

```bash
git add .
git commit -m "Initial commit"
git push
```

### 发布到ComfyUI注册表

如果你想与社区分享这个自定义节点，可以将其发布到注册表。

1. 在 https://registry.comfy.org 创建账户
2. 创建发布者ID（你的注册资料中 `@` 符号后的内容）
3. 在 `pyproject.toml` 文件中添加发布者ID
4. 在注册表上为GitHub发布创建API密钥
5. 将API密钥添加到GitHub仓库的Secrets中，命名为 `REGISTRY_ACCESS_TOKEN`

GitHub操作将在每次git推送时自动运行。你也可以手动运行GitHub操作。

完整说明请参考[官方文档](https://docs.comfy.org/registry/publishing)。

### 贡献指南

欢迎贡献！请遵循以下步骤：

1. Fork本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

### 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件
