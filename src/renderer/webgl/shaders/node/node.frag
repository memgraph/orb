#version 300 es

precision highp float;

in vec2 vUV;
in vec4 vColor;
in vec4 vBorderColor;
in float vBorderThreshold;
in vec4 vShadowColor;
in float vNodeRadius;
in vec2 vShadowOffset;
in float vShadowBlur;
flat in int vShapeType;

out vec4 fragColor;

const int SHAPE_CIRCLE = 0;
const int SHAPE_DOT = 1;
const int SHAPE_SQUARE = 2;
const int SHAPE_DIAMOND = 3;
const int SHAPE_TRIANGLE = 4;
const int SHAPE_TRIANGLE_DOWN = 5;
const int SHAPE_STAR = 6;
const int SHAPE_HEXAGON = 7;

float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

float sdSquare(vec2 p, float r) {
  vec2 d = abs(p) - vec2(r);
  return max(d.x, d.y);
}

float sdDiamond(vec2 p, float r) {
  return (abs(p.x) + abs(p.y)) - r;
}

float sdTriangleDown(vec2 p, float r) {
  float sr = r * 1.15;
  vec2 q = vec2(p.x, p.y - 0.275 * sr);

  float k = sqrt(3.0);
  q.x = abs(q.x) - sr;
  q.y = q.y + sr / k;
  if (q.x + k * q.y > 0.0) {
    q = vec2(q.x - k * q.y, -k * q.x - q.y) / 2.0;
  }
  q.x -= clamp(q.x, -2.0 * sr, 0.0);
  return -length(q) * sign(q.y);
}

float sdTriangleUp(vec2 p, float r) {
  return sdTriangleDown(vec2(p.x, -p.y), r);
}

float sdStar(vec2 p, float r) {
  float sr = r * 0.82;
  vec2 q = vec2(p.x, p.y - 0.1 * sr);

  float outerR = sr * 1.3;
  float innerR = sr * 0.5;

  float angle = atan(q.x, -q.y);
  float sector = 6.2831853 / 5.0;
  float a = mod(angle + sector * 0.5, sector) - sector * 0.5;

  float cosA = cos(a);
  float sinA = abs(sin(a));

  float halfSector = sector * 0.5;
  vec2 outerPt = vec2(outerR, 0.0);
  vec2 innerPt = vec2(innerR * cos(halfSector), innerR * sin(halfSector));

  vec2 sp = vec2(cosA, sinA) * length(q);

  vec2 edge = innerPt - outerPt;
  vec2 toP = sp - outerPt;
  float t = clamp(dot(toP, edge) / dot(edge, edge), 0.0, 1.0);
  float dist = length(toP - edge * t);

  float cross2d = edge.x * toP.y - edge.y * toP.x;
  return cross2d > 0.0 ? -dist : dist;
}

float sdHexagon(vec2 p, float r) {
  vec2 q = abs(p);
  float k = sqrt(3.0);
  float d = max(q.x, (q.x * 0.5 + q.y * (k * 0.5)));
  return d - r;
}

float shapeSDF(vec2 p, float r, int shapeType) {
  if (shapeType == SHAPE_SQUARE) return sdSquare(p, r);
  if (shapeType == SHAPE_DIAMOND) return sdDiamond(p, r);
  if (shapeType == SHAPE_TRIANGLE) return sdTriangleUp(p, r);
  if (shapeType == SHAPE_TRIANGLE_DOWN) return sdTriangleDown(p, r);
  if (shapeType == SHAPE_STAR) return sdStar(p, r);
  if (shapeType == SHAPE_HEXAGON) return sdHexagon(p, r);

  return sdCircle(p, r);
}

void main() {
  float dist = shapeSDF(vUV, vNodeRadius, vShapeType);
  float shadowDist = shapeSDF(vUV - vShadowOffset, vNodeRadius, vShapeType);

  float shadowAlpha = 0.0;
  if (vShadowBlur > 0.0) {
    float t = max(shadowDist, 0.0) / vShadowBlur;
    shadowAlpha = exp(-t * t * 1.5) * 0.5 * vShadowColor.a;
  }

  float aa = 0.02 * vNodeRadius;
  float nodeAlpha = 1.0 - smoothstep(-aa, 0.0, dist);

  float borderDist = shapeSDF(vUV, vBorderThreshold, vShapeType);
  float borderMix = smoothstep(-aa, aa, borderDist);
  vec4 nodeColor = mix(vColor, vBorderColor, borderMix);
  nodeColor.a *= nodeAlpha;

  float finalAlpha = nodeColor.a + shadowAlpha * (1.0 - nodeColor.a);

  if (finalAlpha < 0.001) {
    discard;
  }

  vec3 finalRGB = (nodeColor.rgb * nodeColor.a + vShadowColor.rgb * shadowAlpha * (1.0 - nodeColor.a)) / finalAlpha;
  fragColor = vec4(finalRGB, finalAlpha);
}
