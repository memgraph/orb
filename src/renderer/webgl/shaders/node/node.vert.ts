export default `#version 300 es

precision highp float;

in vec2 aQuadPosition;

in vec2 aCenter;
in float aRadius;
in vec4 aColor;
in vec4 aBorderColor;
in float aBorderWidth;
in vec4 aShadowColor;
in float aShadowSize;
in float aShadowOffsetX;
in float aShadowOffsetY;
in float aShapeType;
in vec2 aImageUV0;
in vec2 aImageUV1;
in float aImageAspect;

uniform vec2 uResolution;
uniform vec2 uTranslation;
uniform float uScale;
uniform vec2 uOriginOffset;

out vec2 vUV;
out vec4 vColor;
out vec4 vBorderColor;
out float vBorderThreshold;
out vec4 vShadowColor;
out float vNodeRadius;
out vec2 vShadowOffset;
out float vShadowBlur;
flat out int vShapeType;
out vec2 vImageUV0;
out vec2 vImageUV1;
out float vImageAspect;

void main() {
  vShapeType = int(aShapeType + 0.5);
  vColor = aColor;
  vBorderColor = aBorderColor;
  vShadowColor = aShadowColor;
  vImageUV0 = aImageUV0;
  vImageUV1 = aImageUV1;
  vImageAspect = aImageAspect;

  float totalRadius = aRadius + aShadowSize + abs(aShadowOffsetX) + abs(aShadowOffsetY);

  vUV = aQuadPosition;
  vNodeRadius = aRadius / totalRadius;

  vBorderThreshold = vNodeRadius * (1.0 - aBorderWidth / aRadius);

  vShadowOffset = vec2(aShadowOffsetX, aShadowOffsetY) / totalRadius;

  vShadowBlur = aShadowSize / totalRadius;

  vec2 worldPos = aCenter + aQuadPosition * totalRadius;
  vec2 screenPos = (worldPos + uOriginOffset) * uScale + uTranslation;

  vec2 clip = (screenPos / uResolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}
`;
