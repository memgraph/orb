#version 300 es

precision highp float;

in vec2 aPosition;

uniform int uTexWidth;

out vec2 vPos;

void main() {
  int tx = gl_VertexID % uTexWidth;
  int ty = gl_VertexID / uTexWidth;
  vec2 ndc = (vec2(float(tx), float(ty)) + 0.5) / float(uTexWidth) * 2.0 - 1.0;
  gl_Position = vec4(ndc, 0.0, 1.0);
  gl_PointSize = 1.0;
  vPos = aPosition;
}
