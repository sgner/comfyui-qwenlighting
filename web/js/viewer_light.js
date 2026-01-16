export const VIEWER_LIGHTING_HTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { margin: 0; overflow: hidden; background-color: #0a0a0f; }
        ::-webkit-scrollbar { width: 0px; background: transparent; }
        .no-select { user-select: none; -webkit-user-select: none; }
    </style>
</head>
<body class="w-full h-screen relative text-gray-200 font-sans">
    
    <div id="container" class="relative w-full h-full">
        <!-- Hint -->
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <span class="text-white/10 text-xs font-bold uppercase tracking-[0.2em] no-select">
                Drag to Move Light
            </span>
        </div>

        <!-- 3D Canvas -->
        <div id="threejs-container" class="w-full h-full absolute inset-0 z-0 cursor-move"></div>

        <!-- Info -->
        <div id="prompt-preview" 
             class="absolute top-3 left-3 right-3 p-2 bg-black/70 backdrop-blur-sm border border-gray-700/50 
                    rounded text-[10px] text-gray-300 text-center pointer-events-none z-10 truncate font-mono shadow-lg">
            Waiting for ComfyUI...
        </div>
        
        <!-- Controls -->
        <div id="controls-overlay" 
             class="absolute bottom-3 left-3 right-3 p-2.5 bg-gray-900/90 backdrop-blur-md 
                    border border-gray-700 rounded-lg flex gap-3 items-center justify-between z-20 shadow-xl">
            
            <!-- Type Select (Updated Options) -->
            <div class="relative flex-grow group">
                <select id="type-select" 
                        class="w-full appearance-none bg-gray-800 text-xs text-gray-200 rounded px-3 py-1.5 
                               border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 
                               outline-none transition-all cursor-pointer hover:bg-gray-750">
                    <option value="Sunlight (Directional)">Sunlight (Directional)</option>
                    <option value="Studio Softbox (Area)">Studio Softbox (Area)</option>
                    <option value="Cinematic Spotlight">Cinematic Spotlight</option>
                    <option value="Practical (Lamp/Bulb)">Practical (Lamp/Bulb)</option>
                    <option value="Ring Light (Beauty)">Ring Light (Beauty)</option>
                    <option value="Neon / Cyberpunk">Neon / Cyberpunk</option>
                    <option value="Fire / Candlelight">Fire / Candlelight</option>
                    <option value="Volumetric (God Rays)">Volumetric (God Rays)</option>
                </select>
                <div class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-white">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>

            <!-- Color -->
            <div class="relative w-8 h-8 flex-shrink-0 rounded border border-gray-600 overflow-hidden cursor-pointer hover:border-gray-400 transition-colors shadow-sm" title="Light Color">
                <div id="color-display" class="absolute inset-0 pointer-events-none bg-white"></div>
                <input type="color" id="color-picker" value="#ffffff" 
                       class="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] cursor-pointer p-0 m-0 opacity-0">
            </div>
        </div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script>
        let state = {
            lightType: "Sunlight (Directional)",
            azimuth: 45,
            elevation: 45,
            intensity: 1.0,
            color: "#ffffff",
            hardness: 0.8
        };

        const container = document.getElementById('threejs-container');
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a0f);
        
        const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
        camera.position.set(0, 1.4, 4.0);
        camera.lookAt(0, 0.5, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        container.appendChild(renderer.domElement);

        // Subject
        const geometry = new THREE.SphereGeometry(0.8, 64, 64);
        const material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.4, metalness: 0.2 });
        const subject = new THREE.Mesh(geometry, material);
        subject.position.y = 0.8;
        subject.castShadow = true; 
        subject.receiveShadow = true;
        scene.add(subject);

        // Floor
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }));
        plane.rotation.x = -Math.PI / 2;
        plane.receiveShadow = true;
        scene.add(plane);

        scene.add(new THREE.AmbientLight(0xffffff, 0.05));

        // Helper
        const bulbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        scene.add(bulbMesh);

        let currentLight = null;

        function createLight() {
            if (currentLight) {
                scene.remove(currentLight);
                if (currentLight.dispose) currentLight.dispose();
            }

            const color = new THREE.Color(state.color);
            const baseInt = state.intensity; 
            const t = state.lightType;

            // --- Enhanced Light Generation Logic ---
            if (t.includes("Directional") || t.includes("Sunlight")) {
                currentLight = new THREE.DirectionalLight(color, baseInt);
                const d = 3;
                currentLight.shadow.camera.left = -d; currentLight.shadow.camera.right = d;
                currentLight.shadow.camera.top = d; currentLight.shadow.camera.bottom = -d;
            
            } else if (t.includes("Area") || t.includes("Softbox")) {
                // Simulating softbox with a wide angle spotlight and soft shadows
                currentLight = new THREE.SpotLight(color, baseInt * 2);
                currentLight.angle = Math.PI / 2.5; // Wide angle
                currentLight.penumbra = 1.0; // Max softness
                currentLight.distance = 15;

            } else if (t.includes("Point") || t.includes("Practical")) {
                currentLight = new THREE.PointLight(color, baseInt * 3, 15);
            
            } else if (t.includes("Spot") || t.includes("God Rays")) {
                currentLight = new THREE.SpotLight(color, baseInt * 4);
                currentLight.angle = Math.PI / 6; // Narrow beam
                currentLight.penumbra = 1.0 - state.hardness; 
                currentLight.distance = 20;

            } else if (t.includes("Neon") || t.includes("Cyberpunk")) {
                currentLight = new THREE.PointLight(color, baseInt * 4, 8); // Shorter range, intense falloff
            
            } else if (t.includes("Candle") || t.includes("Fire")) {
                 currentLight = new THREE.PointLight(color, baseInt * 2, 10);
            
            } else if (t.includes("Ring")) {
                // Ring light simulates frontal fill
                currentLight = new THREE.SpotLight(color, baseInt * 3);
                currentLight.angle = Math.PI / 3;
                currentLight.penumbra = 0.5;
                currentLight.distance = 10;
            } else {
                // Default
                currentLight = new THREE.DirectionalLight(color, baseInt);
            }

            currentLight.castShadow = true;
            currentLight.shadow.bias = -0.001;
            scene.add(currentLight);
            currentLight.typeCheck = t;
        }

        function updateLightTransform() {
            if (!currentLight) return;

            // 1. Position
            const r = 2.0; 
            const azRad = (state.azimuth * Math.PI) / 180;
            const elRad = (state.elevation * Math.PI) / 180;
            
            let x = r * Math.sin(azRad) * Math.cos(elRad);
            let y = r * Math.sin(elRad);
            let z = r * Math.cos(azRad) * Math.cos(elRad);
            
            // Special handling for Ring Light (Locks to camera/front roughly if we wanted, 
            // but for this tool, letting user rotate it around the 'face' is better for control)
            
            const centerY = 0.8;
            const pos = new THREE.Vector3(x, y + centerY, z);
            
            currentLight.position.copy(pos);
            
            // Directional/Spot need targets
            if (currentLight.target) {
                currentLight.lookAt(0, centerY, 0);
                currentLight.target.position.set(0, centerY, 0);
                currentLight.target.updateMatrixWorld();
            }

            // 2. Color & Helper
            currentLight.color.set(state.color);
            bulbMesh.material.color.set(state.color);
            bulbMesh.position.copy(pos);

            // 3. Intensity Scaling based on type characteristics
            let mult = 1.0;
            const t = state.lightType;
            if (t.includes("Spot")) mult = 4.0;
            else if (t.includes("Point") || t.includes("Practical")) mult = 3.0;
            else if (t.includes("Neon")) mult = 4.5;
            else if (t.includes("Softbox")) mult = 2.5;
            
            currentLight.intensity = state.intensity * mult;
            
            // 4. Hardness (Penumbra)
            if (currentLight.penumbra !== undefined && !t.includes("Softbox")) {
                currentLight.penumbra = 1.0 - state.hardness;
            }
        }

        // --- Interaction ---
        const typeSelect = document.getElementById('type-select');
        const colorPicker = document.getElementById('color-picker');
        const colorDisplay = document.getElementById('color-display');
        const previewText = document.getElementById('prompt-preview');

        function updateAll() {
            if (!currentLight || currentLight.typeCheck !== state.lightType) {
                createLight();
            }
            updateLightTransform();
            
            // UI Sync
            if (typeSelect.value !== state.lightType) {
                // Only update if value exists in options (safety)
                const opts = Array.from(typeSelect.options).map(o => o.value);
                if (opts.includes(state.lightType)) {
                    typeSelect.value = state.lightType;
                }
            }

            let hexColor = state.color;
            if (hexColor && hexColor.length === 7) {
                hexColor = hexColor.toLowerCase();
                if (colorPicker.value !== hexColor) colorPicker.value = hexColor;
                colorDisplay.style.backgroundColor = hexColor;
            }
            
            previewText.innerText = \`\${state.lightType} | Az: \${Math.round(state.azimuth)}° El: \${Math.round(state.elevation)}°\`;
        }

        function sendUpdate() {
            window.parent.postMessage({ type: 'LIGHT_UPDATE', ...state }, '*');
        }

        // --- Events ---
        let isDragging = false;
        let lastX = 0, lastY = 0;

        const onMove = (dx, dy) => {
            state.azimuth -= dx * 0.5;
            state.elevation += dy * 0.5;
            state.elevation = Math.max(-85, Math.min(85, state.elevation));
            state.azimuth = (state.azimuth + 360) % 360;
            updateAll();
            sendUpdate();
        };

        const canvas = renderer.domElement;
        const start = (x, y) => { isDragging = true; lastX = x; lastY = y; };
        const end = () => { isDragging = false; };
        const move = (x, y) => {
            if (!isDragging) return;
            onMove(x - lastX, y - lastY);
            lastX = x; lastY = y;
        };

        canvas.addEventListener('mousedown', e => start(e.clientX, e.clientY));
        window.addEventListener('mouseup', end);
        window.addEventListener('mousemove', e => move(e.clientX, e.clientY));
        canvas.addEventListener('touchstart', e => { start(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }, {passive: false});
        window.addEventListener('touchend', end);
        window.addEventListener('touchmove', e => { move(e.touches[0].clientX, e.touches[0].clientY); e.preventDefault(); }, {passive: false});

        typeSelect.addEventListener('change', e => {
            state.lightType = e.target.value;
            updateAll();
            sendUpdate();
        });

        colorPicker.addEventListener('input', e => {
            state.color = e.target.value;
            updateAll();
            sendUpdate();
        });

        window.addEventListener('message', e => {
            if (e.data.type === 'SYNC') {
                if (isDragging) return;
                const { type, ...newData } = e.data;
                Object.assign(state, newData);
                if (state.color && state.color.length === 7) state.color = state.color.toLowerCase();
                updateAll();
            }
        });

        // Loop
        function animate() {
            requestAnimationFrame(animate);
            // Flicker effect for Fire/Candle
            if ((state.lightType.includes("Fire") || state.lightType.includes("Candle")) && currentLight) {
                 currentLight.intensity = (state.intensity * 2) + (Math.random() * 0.2);
            }
            renderer.render(scene, camera);
        }
        
        createLight();
        animate();
        window.parent.postMessage({ type: 'VIEWER_READY' }, '*');
        
        window.addEventListener('resize', () => {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        });
    </script>
</body>
</html>
`;