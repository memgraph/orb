export default `#version 300 es

in vec2 aQuadPosition;

in vec2 aLabelCenter;
in vec2 aLabelSize;
in vec2 aLabelUV0;
in vec2 aLabelUV1;

uniform vec2 uResolution;
uniform vec2 uTranslation;
uniform float uScale;
uniform vec2 uOriginOffset;

out vec2 vAtlasUV;

void main() {
  vec2 worldPos = aLabelCenter + aQuadPosition * aLabelSize;
  vec2 screenPos = (worldPos + uOriginOffset) * uScale + uTranslation;
  vec2 clip = (screenPos / uResolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);

  vec2 uv01 = aQuadPosition * 0.5 + 0.5;
  vAtlasUV = mix(aLabelUV0, aLabelUV1, uv01);
}
`;
