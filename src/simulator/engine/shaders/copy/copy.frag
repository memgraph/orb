#version 300 es

precision highp float;

in vec2 vPos;
out vec4 fragColor;

void main() {
  fragColor = vec4(vPos, 0.0, 0.0);
}
