import { app } from "../../../../scripts/app.js";
import { VIEWER_LIGHTING_HTML } from "./viewer_light.js";

app.registerExtension({
    name: "qwen.lighting.control",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "QwenLightingNode") { // 确保这里的名字和你 __init__.py 里的 NODE_CLASS_MAPPINGS 对应
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);

                const node = this;

                // --- 1. 创建 Iframe 容器 ---
                const iframe = document.createElement("iframe");
                Object.assign(iframe.style, {
                    width: "100%", height: "100%", border: "none",
                    backgroundColor: "#0a0a0f", borderRadius: "8px", display: "block"
                });

                // 创建 Blob URL
                const blob = new Blob([VIEWER_LIGHTING_HTML], { type: 'text/html' });
                iframe.src = URL.createObjectURL(blob);

                const widget = this.addDOMWidget("lighting_preview", "LIGHTING_VIEW", iframe, {
                    getValue() { return ""; }, setValue(v) {}
                });
                widget.computeSize = (w) => [w || 300, 320];

                // 状态锁：防止死循环 (3D -> Widget -> 3D)
                node.isUpdatingFrom3D = false;

                // --- 辅助函数：查找 Widget (忽略大小写) ---
                // 这是解决“获取不到数据”的关键！
                const findWidget = (name) => {
                    if (!node.widgets) return null;
                    const target = name.toLowerCase();
                    return node.widgets.find(w => w.name.toLowerCase() === target);
                };

                // --- 2. 核心逻辑：把 ComfyUI 的值发给 3D 视图 ---
                const syncToView = () => {
                    if (!iframe.contentWindow) return;

                    const getVal = (name, def) => {
                        const w = findWidget(name);
                        return w ? w.value : def;
                    };

                    // 发送 SYNC 消息
                    iframe.contentWindow.postMessage({
                        type: "SYNC",
                        lightType: getVal("light_type", "Directional (Sun)"),
                        azimuth: getVal("azimuth", 45),
                        elevation: getVal("elevation", 45),
                        intensity: getVal("intensity", 1.0),
                        color: getVal("light_color", "#FFFFFF"),
                        hardness: getVal("hardness", 0.8)
                    }, "*");
                };

                // --- 3. 核心逻辑：接收 3D 视图发来的数据 ---
                const messageHandler = (event) => {
                    // 安全检查：忽略不是来自这个 iframe 的消息
                    if (event.source !== iframe.contentWindow) return;

                    const data = event.data;
                    if (data.type === 'VIEWER_READY') {
                        syncToView();
                    } 
                    // 情况 B: 用户在拖拽 3D 视图 -> 更新 ComfyUI
                    else if (data.type === 'LIGHT_UPDATE') {
                        if (!node.widgets) return;
                        node.isUpdatingFrom3D = true;
                        try {
                            const updateWidget = (name, val) => {
                                const w = findWidget(name);
                                if (w) {
                                    // 只有值不同的时候才更新，节省资源
                                    if (w.value !== val) {
                                        w.value = val;
                                        // 如果控件有回调（例如下拉菜单），手动触发它
                                        if (w.callback) {
                                            w.callback(val, app.graph.canvas, node, app.graph.canvas.getPointer(), event);
                                        }
                                    }
                                } else {
                                    console.warn(`[QwenLighting] 警告：找不到名为 '${name}' 的输入项，请检查 Python 节点定义。`);
                                }
                            };

                            // 执行更新
                            updateWidget("light_type", data.lightType);
                            updateWidget("azimuth", Math.round(data.azimuth));
                            updateWidget("elevation", Math.round(data.elevation));
                            updateWidget("intensity", Number(data.intensity));
                            updateWidget("hardness", Number(data.hardness));
                            
                            if (data.color) {
                                updateWidget("light_color", data.color.toUpperCase());
                            }

                            // 标记画布为“脏”，强制刷新 UI 显示
                            app.graph.setDirtyCanvas(true, true);

                        } catch (err) {
                            console.error("[QwenLighting] 更新出错:", err);
                        } finally {
                            // 无论成功失败，必须释放锁
                            node.isUpdatingFrom3D = false;
                        }
                    }
                };

                window.addEventListener('message', messageHandler);

                // --- 4. 监听用户手动修改 ComfyUI 控件 ---
                const origCallback = this.onWidgetChanged;
                this.onWidgetChanged = function (name, value, old_value, widget) {
                    if (origCallback) origCallback.apply(this, arguments);
                    
                    // 如果这次修改是由 3D 视图触发的，就不要再发回去了（防止死循环）
                    if (node.isUpdatingFrom3D) return;

                    // 只有这几个相关参数变动时才同步
                    const relevantParams = ["light_type", "azimuth", "elevation", "intensity", "light_color", "hardness"];
                    if (relevantParams.some(p => p.toLowerCase() === name.toLowerCase())) {
                        syncToView();
                    }
                };

                // --- 清理工作 ---
                const origOnRemoved = this.onRemoved;
                this.onRemoved = function() {
                    window.removeEventListener('message', messageHandler);
                    if (iframe.src) URL.revokeObjectURL(iframe.src);
                    if (origOnRemoved) origOnRemoved.apply(this, arguments);
                };
                
                this.setSize([340, 520]);
            };
        }
    }
});