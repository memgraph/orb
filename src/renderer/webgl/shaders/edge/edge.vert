#version 300 es

precision highp float;

in vec2 aQuadPosition;

in vec2 aStart;
in vec2 aEnd;
in vec2 aControl;
in float aWidth;
in float aEdgeType;
in float aLoopbackRadius;
in float aArrowSize;
in vec2 aArrowTip;
in vec2 aArrowDir;
in vec4 aColor;
in vec4 aShadowColor;
in float aShadowSize;
in float aShadowOffsetX;
in float aShadowOffsetY;

uniform vec2 uResolution;
uniform vec2 uTranslation;
uniform float uScale;
uniform vec2 uOriginOffset;

out vec2 vWorldPos;
out vec2 vStart;
out vec2 vEnd;
out vec2 vControl;
out float vHalfWidth;
out float vWidthFade;
out float vHalfWidthPx;
out float vPerpPx;
out float vLoopbackRadius;
out float vArrowSize;
out vec2 vArrowTip;
out vec2 vArrowDir;
out vec4 vColor;
out vec4 vShadowColor;
out float vShadowSize;
out vec2 vShadowOffset;
flat out int vEdgeType;

void main() {
  vEdgeType = int(aEdgeType + 0.5);
  vStart = aStart;
  vEnd = aEnd;
  vControl = aControl;
  float effectiveWidth = max(aWidth, 1.0 / uScale);
  vHalfWidth = effectiveWidth * 0.5;
  vWidthFade = clamp(aWidth * uScale, 0.0, 1.0);
  vHalfWidthPx = vHalfWidth * uScale;
  vPerpPx = 0.0;
  vLoopbackRadius = aLoopbackRadius;
  vArrowSize = aArrowSize;
  vArrowTip = aArrowTip;
  vArrowDir = aArrowDir;
  vColor = aColor;
  vShadowColor = aShadowColor;
  vShadowSize = aShadowSize;
  vShadowOffset = vec2(aShadowOffsetX, aShadowOffsetY);

  float pad = vHalfWidth + aShadowSize + abs(aShadowOffsetX) + abs(aShadowOffsetY);

  vec2 worldPos;

  if (vEdgeType == 0) {
    vec2 dir = aEnd - aStart;
    float len = length(dir);
    vec2 unitDir = dir / max(len, 0.0001);
    vec2 perp = vec2(-unitDir.y, unitDir.x);
    float totalHalf = pad + aArrowSize;
    vec2 midpoint = (aStart + aEnd) * 0.5;
    worldPos = midpoint
      + unitDir * (len * 0.5 + totalHalf) * aQuadPosition.x
      + perp * totalHalf * aQuadPosition.y;
    vPerpPx = totalHalf * aQuadPosition.y * uScale;
  } else if (vEdgeType == 1) {
    float margin = pad + aArrowSize;
    vec2 bboxMin = min(min(aStart, aEnd), aControl) - margin;
    vec2 bboxMax = max(max(aStart, aEnd), aControl) + margin;
    vec2 center = (bboxMin + bboxMax) * 0.5;
    vec2 halfSize = (bboxMax - bboxMin) * 0.5;
    worldPos = center + aQuadPosition * halfSize;
  } else {
    float margin = pad + aArrowSize;
    vec2 ctr = aControl;
    float r = aLoopbackRadius;
    vec2 bboxMin = min(ctr - (r + margin), aStart - margin);
    vec2 bboxMax = max(ctr + (r + margin), aStart + margin);
    vec2 center = (bboxMin + bboxMax) * 0.5;
    vec2 halfSize = (bboxMax - bboxMin) * 0.5;
    worldPos = center + aQuadPosition * halfSize;
  }

  vWorldPos = worldPos;
  vec2 screenPos = (worldPos + uOriginOffset) * uScale + uTranslation;
  vec2 clip = (screenPos / uResolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}
