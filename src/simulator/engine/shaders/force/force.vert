#version 300 es

precision highp float;

in vec2 aPosition;
in vec2 aVelocity;
in float aFixed; // 1.0 if node is fixed, 0.0 if free
in vec2 aFixedPos;

uniform sampler2D uPositions;
uniform int uNodeCount;
uniform int uTexWidth;
uniform float uAlpha;
uniform float uRepulsionStrength;
uniform vec2 uCenter;
uniform float uCenterStrength;
uniform float uDamping;

out vec2 vPosition;
out vec2 vVelocity;
out float vFixed;
out vec2 vFixedPos;

ivec2 idx2uv(int idx) {
  return ivec2(idx % uTexWidth, idx / uTexWidth);
}

void main() {
  int nodeId = gl_VertexID;

  vFixed = aFixed;
  vFixedPos = aFixedPos;

  if (aFixed > 0.5) {
    vPosition = aFixedPos;
    vVelocity = vec2(0.0);
    return;
  }

  vec2 pos = aPosition;
  vec2 vel = aVelocity;

  vec2 repulsion = vec2(0.0);
  for (int j = 0; j < uNodeCount; j++) {
    if (j == nodeId) {
      continue;
    }

    vec4 other = texelFetch(uPositions, idx2uv(j), 0);
    vec2 delta = other.xy - pos;
    float distSq = dot(delta, delta) + 1.0;
    repulsion += delta * (uRepulsionStrength * uAlpha / distSq);
  }

  vec2 centering = (uCenter - pos) * uCenterStrength * uAlpha;

  vel = (vel + repulsion + centering) * uDamping;
  pos = pos + vel;

  vPosition = pos;
  vVelocity = vel;
}