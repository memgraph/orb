import { OrbError } from '../../../exceptions';
import { compileShader, ShaderType } from './shaders.utils';

export const createProgram = (
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram => {
  const vertexShader = compileShader(gl, vertexSource, ShaderType.VERTEX);
  const fragmentShader = compileShader(gl, fragmentSource, ShaderType.FRAGMENT);

  const program = gl.createProgram();
  if (!program) {
    throw new OrbError('Failed to create program.');
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new OrbError(`Failed to link program: ${info}`);
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
};
