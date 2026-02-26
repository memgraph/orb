import { OrbError } from '../../../exceptions';

export enum ShaderType {
  VERTEX = 'vertex',
  FRAGMENT = 'fragment',
}

export const compileShader = (gl: WebGL2RenderingContext, source: string, type: ShaderType): WebGLShader => {
  const shader = gl.createShader(type === ShaderType.VERTEX ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
  if (!shader) {
    throw new OrbError('Failed to create shader.');
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new OrbError(`Failed to compile shader: ${info}`);
  }

  return shader;
};
