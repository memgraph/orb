#version 300 es

precision highp float;

in vec2 vWorldPos;
in vec2 vStart;
in vec2 vEnd;
in vec2 vControl;
in float vHalfWidth;
in float vWidthFade;
in float vHalfWidthPx;
in float vPerpPx;
in float vLoopbackRadius;
in float vArrowSize;
in vec2 vArrowTip;
in vec2 vArrowDir;
in vec4 vColor;
in vec4 vShadowColor;
in float vShadowSize;
in vec2 vShadowOffset;
flat in int vEdgeType;

uniform bool uSimpleMode;

out vec4 fragColor;

float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float sdBezier(vec2 pos, vec2 A, vec2 B, vec2 C) {
  vec2 a = B - A;
  vec2 b = A - 2.0 * B + C;
  vec2 c = a * 2.0;
  vec2 d = A - pos;

  float kk = 1.0 / max(dot(b, b), 0.0001);
  float kx = kk * dot(a, b);
  float ky = kk * (2.0 * dot(a, a) + dot(d, b)) / 3.0;
  float kz = kk * dot(d, a);

  float p = ky - kx * kx;
  float q = kx * (2.0 * kx * kx - 3.0 * ky) + kz;
  float p3 = p * p * p;
  float q2 = q * q;
  float h = q2 + 4.0 * p3;

  float res;
  if (h >= 0.0) {
    h = sqrt(h);
    vec2 x = (vec2(h, -h) - q) / 2.0;
    vec2 uv = sign(x) * pow(abs(x), vec2(1.0 / 3.0));
    float t = clamp(uv.x + uv.y - kx, 0.0, 1.0);
    vec2 qo = d + (c + b * t) * t;
    res = dot(qo, qo);
  } else {
    float z = sqrt(-p);
    float v = acos(q / (p * z * 2.0)) / 3.0;
    float m = cos(v);
    float n = sin(v) * 1.732050808;
    vec3 t = clamp(vec3(m + m, -n - m, n - m) * z - kx, 0.0, 1.0);
    vec2 qx = d + (c + b * t.x) * t.x;
    float dx = dot(qx, qx);
    vec2 qy = d + (c + b * t.y) * t.y;
    float dy = dot(qy, qy);
    res = min(dx, dy);
  }

  return sqrt(res);
}

float sdArrow(vec2 p, vec2 tip, vec2 dir, float size) {
  if (size <= 0.0) return 1e6;

  vec2 perp = vec2(-dir.y, dir.x);
  vec2 rel = p - tip;
  float along = dot(rel, -dir);
  float across = dot(rel, perp);

  if (along < 0.0) return length(rel);
  if (along > size) {
    float hw = size * 0.4;
    float closest = clamp(across, -hw, hw);
    vec2 pt = tip - dir * size + perp * closest;
    return length(p - pt);
  }

  float halfW = (along / size) * size * 0.4;
  float d = abs(across) - halfW;
  return d;
}

void main() {
  if (uSimpleMode && vEdgeType == 0) {
    float cover = clamp(vHalfWidthPx - abs(vPerpPx) + 0.5, 0.0, 1.0);
    float a = cover * vWidthFade;
    if (a < 0.001) discard;
    fragColor = vec4(vColor.rgb, vColor.a * a);
    return;
  }

  float dist;
  if (vEdgeType == 0) {
    dist = sdSegment(vWorldPos, vStart, vEnd);
  } else if (vEdgeType == 1) {
    dist = sdBezier(vWorldPos, vStart, vControl, vEnd);
  } else {
    dist = abs(length(vWorldPos - vControl) - vLoopbackRadius);
  }

  float edgeSdf = dist - vHalfWidth;
  float combinedSdf = edgeSdf;

  if (vArrowSize > 0.0) {
    float arrowDist = sdArrow(vWorldPos, vArrowTip, vArrowDir, vArrowSize);
    combinedSdf = min(edgeSdf, arrowDist);
  }

  float shadowAlpha = 0.0;
  if (vShadowSize > 0.0) {
    vec2 shadowPos = vWorldPos - vShadowOffset;
    float shadowDist;
    if (vEdgeType == 0) {
      shadowDist = sdSegment(shadowPos, vStart, vEnd);
    } else if (vEdgeType == 1) {
      shadowDist = sdBezier(shadowPos, vStart, vControl, vEnd);
    } else {
      shadowDist = abs(length(shadowPos - vControl) - vLoopbackRadius);
    }
    float shadowArrowDist = vArrowSize > 0.0
      ? sdArrow(shadowPos, vArrowTip, vArrowDir, vArrowSize)
      : 1.0e6;
    float shadowCombined = min(shadowDist - vHalfWidth, shadowArrowDist);
    float t = max(shadowCombined, 0.0) / vShadowSize;
    shadowAlpha = exp(-t * t * 1.5) * 0.5 * vShadowColor.a;
  }

  float aa = fwidth(combinedSdf);
  float edgeAlpha = (1.0 - smoothstep(-aa, aa, combinedSdf)) * vWidthFade;
  vec4 edgeColor = vColor;
  edgeColor.a *= edgeAlpha;

  float finalAlpha = edgeColor.a + shadowAlpha * (1.0 - edgeColor.a);

  if (finalAlpha < 0.001) discard;

  if (shadowAlpha > 0.0) {
    vec3 finalRGB = (edgeColor.rgb * edgeColor.a + vShadowColor.rgb * shadowAlpha * (1.0 - edgeColor.a)) / finalAlpha;
    fragColor = vec4(finalRGB, finalAlpha);
  } else {
    fragColor = edgeColor;
  }
}
