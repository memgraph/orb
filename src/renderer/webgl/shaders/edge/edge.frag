#version 300 es

precision highp float;

in vec2 vLocalPos;
in vec4 vColor;
in vec4 vShadowColor;
in float vEdgeRatio;
in float vShadowOffsetPerp;
in float vShadowBlur;

out vec4 fragColor;

void main() {
  float perpDist = abs(vLocalPos.y);
  float shadowPerpDist = abs(vLocalPos.y - vShadowOffsetPerp);

  float shadowAlpha = 0.0;
  if (vShadowBlur > 0.0) {
    float t = max(shadowPerpDist - vEdgeRatio, 0.0) / vShadowBlur;
    shadowAlpha = exp(-t * t * 1.5) * 0.5 * vShadowColor.a;
  }

  float aa = 0.02 * vEdgeRatio;
  float edgeAlpha = 1.0 - smoothstep(vEdgeRatio - aa, vEdgeRatio, perpDist);
  vec4 edgeColor = vColor;
  edgeColor.a *= edgeAlpha;

  float finalAlpha = edgeColor.a + shadowAlpha * (1.0 - edgeColor.a);

  if (finalAlpha < 0.001) {
    discard;
  }

  vec3 finalRGB = (edgeColor.rgb * edgeColor.a + vShadowColor.rgb * shadowAlpha * (1.0 - edgeColor.a)) / finalAlpha;
  fragColor = vec4(finalRGB, finalAlpha);
}
