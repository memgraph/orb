#version 300 es

precision highp float;

in vec2 aQuadPosition;

in vec2 aStart;
in vec2 aEnd;
in float aWidth;
in vec4 aColor;
in vec4 aShadowColor;
in float aShadowSize;
in float aShadowOffsetX;
in float aShadowOffsetY;

uniform vec2 uResolution;
uniform vec2 uTranslation;
uniform float uScale;
uniform vec2 uOriginOffset;

out vec2 vLocalPos;
out vec4 vColor;
out vec4 vShadowColor;
out float vEdgeRatio;
out float vShadowOffsetPerp;
out float vShadowBlur;

void main() {
  vColor = aColor;
  vShadowColor = aShadowColor;
  vLocalPos = aQuadPosition;

  vec2 dir = aEnd - aStart;
  float len = length(dir);
  vec2 unitDir = dir / max(len, 0.0001);
  vec2 perp = vec2(-unitDir.y, unitDir.x);

  float halfWidth = aWidth * 0.5;

  float shadowOffPerp = dot(vec2(aShadowOffsetX, aShadowOffsetY), perp);

  float totalHalfWidth = halfWidth + aShadowSize + abs(shadowOffPerp);

  vEdgeRatio = halfWidth / max(totalHalfWidth, 0.0001);
  vShadowOffsetPerp = shadowOffPerp / max(totalHalfWidth, 0.0001);
  vShadowBlur = aShadowSize / max(totalHalfWidth, 0.0001);

  vec2 midpoint = (aStart + aEnd) * 0.5;
  vec2 worldPos = midpoint + unitDir * (len * 0.5) * aQuadPosition.x + perp * totalHalfWidth * aQuadPosition.y;

  vec2 screenPos = (worldPos + uOriginOffset) * uScale + uTranslation;
  vec2 clip = (screenPos / uResolution) * 2.0 - 1.0;

  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}
