#version 300 es

precision highp float;

uniform sampler2D uState;
uniform sampler2D uFixed;
uniform sampler2D uTreeData;
uniform sampler2D uTreeChildren;
uniform sampler2D uTreeGeometry;
uniform sampler2D uAdjOffsets;
uniform sampler2D uAdjEdges;

uniform int uNodeCount;
uniform int uTexWidth;
uniform float uAlpha;
uniform float uDamping;

uniform float uManyBodyStrength;
uniform float uTheta2;
uniform float uDistanceMin2;
uniform float uDistanceMax2;
uniform int uTreeNodeCount;
uniform int uTreeTexWidth;

uniform int uAdjOffsetsTexWidth;
uniform int uAdjEdgesTexWidth;

uniform vec2 uCenter;
uniform float uCenterStrength;

uniform float uCollisionRadius;
uniform float uCollisionStrength;

uniform float uForceXTarget;
uniform float uForceXStrength;
uniform float uForceYTarget;
uniform float uForceYStrength;

uniform float uHasManyBody;
uniform float uHasLinks;
uniform float uHasCentering;
uniform float uHasCollision;
uniform float uHasPositioning;

out vec4 fragColor;

ivec2 texCoord(int idx, int tw) {
  return ivec2(idx % tw, idx / tw);
}

void main() {
  ivec2 fc = ivec2(gl_FragCoord.xy);
  int nodeId = fc.y * uTexWidth + fc.x;

  if (nodeId >= uNodeCount) {
    fragColor = vec4(0.0);
    return;
  }

  vec4 fixedData = texelFetch(uFixed, fc, 0);
  if (fixedData.x > 0.5) {
    fragColor = vec4(fixedData.yz, 0.0, 0.0);
    return;
  }

  vec4 state = texelFetch(uState, fc, 0);
  vec2 pos = state.xy;
  vec2 vel = state.zw;

  if (uHasManyBody > 0.5 && uTreeNodeCount > 0) {
    int stack[128];
    int top = 0;
    stack[top++] = 0;

    while (top > 0) {
      int idx = stack[--top];
      vec4 data = texelFetch(uTreeData, texCoord(idx, uTreeTexWidth), 0);
      float w = data.w;

      if (w < -0.5) {
        int bodyIdx = int(-w - 0.5);
        if (bodyIdx != nodeId) {
          vec2 delta = data.xy - pos;
          float distSq = dot(delta, delta);

          if (distSq < 1e-8) {
            delta = vec2(float(nodeId) * 1e-4 - float(bodyIdx) * 1e-4 + 1e-4, 1e-4);
            distSq = dot(delta, delta);
          }

          if (distSq < uDistanceMax2) {
            float l = distSq;
            if (l < uDistanceMin2) l = sqrt(uDistanceMin2 * l);
            vel += delta * (data.z * uAlpha / max(l, 1e-6));
          }
        }
      } else {
        vec2 delta = data.xy - pos;
        float distSq = dot(delta, delta);

        if (distSq > 0.0 && w * w / distSq < uTheta2) {
          if (distSq < uDistanceMax2) {
            float l = distSq;
            if (l < uDistanceMin2) l = sqrt(uDistanceMin2 * l);
            vel += delta * (data.z * uAlpha / max(l, 1e-6));
          }
        } else {
          vec4 ch = texelFetch(uTreeChildren, texCoord(idx, uTreeTexWidth), 0);
          if (ch.w >= 0.0 && top < 64) stack[top++] = int(ch.w + 0.5);
          if (ch.z >= 0.0 && top < 64) stack[top++] = int(ch.z + 0.5);
          if (ch.y >= 0.0 && top < 64) stack[top++] = int(ch.y + 0.5);
          if (ch.x >= 0.0 && top < 64) stack[top++] = int(ch.x + 0.5);
        }
      }
    }
  }

  if (uHasCollision > 0.5 && uCollisionRadius > 0.0 && uTreeNodeCount > 0) {
    float collisionDiam = uCollisionRadius * 2.0;
    vec2 predictedPos = state.xy + state.zw;
    int stack[64];
    int top = 0;
    stack[top++] = 0;

    while (top > 0) {
      int idx = stack[--top];
      vec4 data = texelFetch(uTreeData, texCoord(idx, uTreeTexWidth), 0);
      float w = data.w;

      if (w < -0.5) {
        int bodyIdx = int(-w - 0.5);
        if (bodyIdx != nodeId && bodyIdx < uNodeCount) {
          vec2 delta = data.xy - predictedPos;
          float dist = length(delta);

          if (dist < collisionDiam && dist > 0.0) {
            float push = (collisionDiam - dist) * uCollisionStrength;
            vel -= (delta / dist) * push * 0.5;
          }
        }
      } else {
        vec4 geo = texelFetch(uTreeGeometry, texCoord(idx, uTreeTexWidth), 0);
        float cellSize = geo.z;
        vec2 nearest = clamp(predictedPos, geo.xy, geo.xy + cellSize);
        float distToCell = length(nearest - predictedPos);

        if (distToCell < collisionDiam) {
          vec4 ch = texelFetch(uTreeChildren, texCoord(idx, uTreeTexWidth), 0);
          if (ch.w >= 0.0 && top < 64) stack[top++] = int(ch.w + 0.5);
          if (ch.z >= 0.0 && top < 64) stack[top++] = int(ch.z + 0.5);
          if (ch.y >= 0.0 && top < 64) stack[top++] = int(ch.y + 0.5);
          if (ch.x >= 0.0 && top < 64) stack[top++] = int(ch.x + 0.5);
        }
      }
    }
  }

  if (uHasLinks > 0.5) {
    vec4 offData = texelFetch(uAdjOffsets, texCoord(nodeId, uAdjOffsetsTexWidth), 0);
    int start = int(offData.x + 0.5);
    int count = int(offData.y + 0.5);

    for (int e = 0; e < count; e++) {
      vec4 edgeData = texelFetch(uAdjEdges, texCoord(start + e, uAdjEdgesTexWidth), 0);
      int targetId = int(edgeData.x + 0.5);
      float restDist = edgeData.y;
      float strength = edgeData.z;
      float dirBias = edgeData.w;

      vec4 targetState = texelFetch(uState, texCoord(targetId, uTexWidth), 0);
      vec2 delta = (targetState.xy + targetState.zw) - (state.xy + state.zw);
      float d = length(delta);

      if (d < 1e-6) {
        delta = vec2(1e-3, 1e-3);
        d = length(delta);
      }

      float scale = (d - restDist) / d * uAlpha * strength;
      vel += delta * scale * dirBias;
    }
  }

  if (uHasCentering > 0.5) {
    vel += (uCenter - pos) * uCenterStrength * uAlpha;
  }

  if (uHasPositioning > 0.5) {
    vel.x += (uForceXTarget - pos.x) * uForceXStrength * uAlpha;
    vel.y += (uForceYTarget - pos.y) * uForceYStrength * uAlpha;
  }

  vel *= uDamping;
  pos += vel;

  fragColor = vec4(pos, vel);
}
