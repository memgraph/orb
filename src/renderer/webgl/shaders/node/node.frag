#version 300 es

precision highp float;

in vec2 vUV;
in vec4 vColor;
in vec4 vBorderColor;
in float vBorderThreshold;
in vec4 vShadowColor;
in float vNodeRadius;
in vec2 vShadowOffset;
in float vShadowBlur;

out vec4 fragColor;

void main() {
  float dist = length(vUV);
  float shadowDist = length(vUV - vShadowOffset);

  float shadowAlpha = 0.0;
  if (vShadowBlur > 0.0) {
    float t = max(shadowDist - vNodeRadius, 0.0) / vShadowBlur;
    shadowAlpha = exp(-t * t * 1.5) * 0.5 * vShadowColor.a;
  }

  float aa = 0.02 * vNodeRadius;
  float nodeAlpha = 1.0 - smoothstep(vNodeRadius - aa, vNodeRadius, dist);
  float borderMix = smoothstep(vBorderThreshold - aa, vBorderThreshold + aa, dist);
  vec4 nodeColor = mix(vColor, vBorderColor, borderMix);
  nodeColor.a *= nodeAlpha;

  float finalAlpha = nodeColor.a + shadowAlpha * (1.0 - nodeColor.a);

  if (finalAlpha < 0.001) {
    discard;
  }

  vec3 finalRGB = (nodeColor.rgb * nodeColor.a + vShadowColor.rgb * shadowAlpha * (1.0 - nodeColor.a)) / finalAlpha;
  fragColor = vec4(finalRGB, finalAlpha);
}
