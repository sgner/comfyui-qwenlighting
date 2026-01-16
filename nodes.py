import os
import json
import math
import folder_paths

# Module-level cache
_cache = {}
_max_cache_size = 50
_config_data = None

class QwenLightingNode:
    """
    3D Lighting Control Node (High-Precision Color Matching)
    Designed to work with an extensive color database in lighting_maps.json.
    """

    def __init__(self):
        self.load_config()

    @classmethod
    def INPUT_TYPES(cls):
        light_types = [
            "Sunlight (Directional)", 
            "Studio Softbox (Area)", 
            "Cinematic Spotlight", 
            "Practical (Lamp/Bulb)",
            "Ring Light (Beauty)",
            "Neon / Cyberpunk",
            "Fire / Candlelight",
            "Volumetric (God Rays)"
        ]
        
        return {
            "required": {
                "light_type": (light_types,),
                "azimuth": ("INT", {
                    "default": 45, "min": 0, "max": 360, "step": 1, "display": "slider"
                }),
                "elevation": ("INT", {
                    "default": 45, "min": -90, "max": 90, "step": 1, "display": "slider"
                }),
                "intensity": ("FLOAT", {
                    "default": 1.0, "min": 0.0, "max": 2.0, "step": 0.1, "display": "slider"
                }),
                "light_color": ("STRING", {
                    "default": "#FFFFFF", "multiline": False
                }),
                "hardness": ("FLOAT", { 
                    "default": 0.8, "min": 0.0, "max": 1.0, "step": 0.1
                }),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("lighting_prompt",)
    FUNCTION = "generate_lighting_prompt"
    CATEGORY = "image/lighting"
    OUTPUT_NODE = True

    def load_config(self):
        global _config_data
        if _config_data is not None: return

        try:
            current_dir = os.path.dirname(os.path.realpath(__file__))
            config_path = os.path.join(current_dir, "lighting_maps.json")
            if os.path.exists(config_path):
                with open(config_path, 'r', encoding='utf-8') as f:
                    _config_data = json.load(f)
            else:
                _config_data = {}
        except Exception:
            _config_data = {}

    def _hex_to_rgb(self, hex_color):
        hex_color = hex_color.lstrip('#')
        if len(hex_color) != 6: return (255, 255, 255)
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

    def _get_range_prompt(self, value, map_key):
        if not _config_data or map_key not in _config_data: return ""
        mapping = _config_data[map_key]
        try:
            sorted_keys = sorted([float(k) for k in mapping.keys()])
        except ValueError: return ""
        
        selected_key = sorted_keys[0]
        for k in sorted_keys:
            if k <= value: selected_key = k
            else: break
            
        str_key_float, str_key_int = str(selected_key), str(int(selected_key))
        if str_key_float in mapping: return mapping[str_key_float]
        elif str_key_int in mapping: return mapping[str_key_int]
        return ""

    def _get_smart_color_name(self, hex_color, intensity):
        """
        Finds the mathematically closest color from the JSON list.
        Ignores hex codes in output.
        """
        if not _config_data or "colors" not in _config_data: return "colored light"
        
        r, g, b = self._hex_to_rgb(hex_color)
        target_rgb = (r, g, b)
        
        # Performance check: if it's pure white/black, skip calculation
        if r > 250 and g > 250 and b > 250: return "neutral white light"
        if r < 10 and g < 10 and b < 10: return "" # Let intensity handle darkness

        min_dist = float('inf')
        closest_name = "white"

        # Iterate through all ~120 colors to find the best match
        for map_hex, map_name in _config_data["colors"].items():
            map_rgb = self._hex_to_rgb(map_hex)
            # Euclidean distance in RGB space
            # dist = sqrt((r1-r2)^2 + (g1-g2)^2 + (b1-b2)^2)
            # We omit sqrt for speed as comparison result is same
            dist = sum((t - m) ** 2 for t, m in zip(target_rgb, map_rgb))
            
            if dist < min_dist:
                min_dist = dist
                closest_name = map_name
        
        return f"{closest_name} light"

    def generate_lighting_prompt(self, light_type, azimuth, elevation, intensity, light_color, hardness, unique_id=None):
        self.load_config()
        
        cache_key = f"{unique_id}_{light_type}_{azimuth}_{elevation}_{intensity}_{light_color}_{hardness}"
        if cache_key in _cache: return _cache[cache_key]

        # 1. Type
        type_desc = _config_data.get("light_type_prompts", {}).get(light_type, light_type)

        # 2. Ranges
        azimuth = azimuth % 360
        int_desc = self._get_range_prompt(intensity, "intensity_ranges")
        az_desc = self._get_range_prompt(azimuth, "azimuth_ranges")
        el_desc = self._get_range_prompt(elevation, "elevation_ranges")

        # 3. Color
        color_desc = self._get_smart_color_name(light_color, intensity)

        # 4. Hardness
        if hardness >= 0.8: hard_desc = "hard shadows"
        elif hardness >= 0.5: hard_desc = "defined shadows"
        elif hardness >= 0.3: hard_desc = "soft shadows"
        else: hard_desc = "shadowless"

        # Assemble Prompt
        # Order: [Direction] [Type] [Color] [Elevation] [Quality] [Intensity]
        # Placing direction first helps with the "facing wrong way" issue
        parts = [az_desc, type_desc, color_desc, el_desc, hard_desc, int_desc]
        
        final_prompt = ", ".join([p for p in parts if p and p.strip() != ""])
        final_prompt = f",off-screen light source,{final_prompt}"
        result = {"ui": {}, "result": (final_prompt,)}
        _cache[cache_key] = result
        if len(_cache) > _max_cache_size: _cache.pop(next(iter(_cache)))
        return result
    
NODE_CLASS_MAPPINGS = {
    "QwenLightingNode": QwenLightingNode,
}
NODE_DISPLAY_NAME_MAPPINGS = {
    "QwenLightingNode": "Qwen Multiangle Lighting",
}