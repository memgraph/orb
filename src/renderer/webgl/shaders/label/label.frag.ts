export default `#version 300 es

precision highp float;

uniform sampler2D uAtlas;

in vec2 vAtlasUV;

out vec4 fragColor;

void main() {
  vec4 texel = texture(uAtlas, vAtlasUV);
  if (texel.a < 0.01) discard;
  fragColor = texel;
}
`;
