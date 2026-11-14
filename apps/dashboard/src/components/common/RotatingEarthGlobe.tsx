import { useEffect, useRef } from 'react';

interface RotatingEarthGlobeProps {
  size?: number;
  className?: string;
}

export default function RotatingEarthGlobe({ size = 480, className = '' }: RotatingEarthGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationFrameId: number;
    let gl = canvas.getContext('webgl', { alpha: true, antialias: true });

    if (!gl) {
      // Fallback 2D render if WebGL unavailable
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let angle = 0;
        const img = new Image();
        img.src = '/earth-globe.jpg';
        const render2D = () => {
          ctx.clearRect(0, 0, size, size);
          ctx.save();
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2 - 8, 0, Math.PI * 2);
          ctx.clip();
          angle = (angle + 0.4) % size;
          if (img.complete) {
            ctx.drawImage(img, -angle, 0, size * 2, size);
            ctx.drawImage(img, size * 2 - angle, 0, size * 2, size);
          }
          ctx.restore();
          animationFrameId = requestAnimationFrame(render2D);
        };
        render2D();
      }
      return () => cancelAnimationFrame(animationFrameId);
    }

    // ── WebGL 3D Sphere Renderer ──
    const vsSource = `
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      attribute vec2 aTexCoord;

      uniform mat4 uProjection;
      uniform mat4 uModelView;

      varying vec2 vTexCoord;
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vTexCoord = aTexCoord;
        vNormal = mat3(uModelView) * aNormal;
        vec4 pos = uModelView * vec4(aPosition, 1.0);
        vViewPosition = -pos.xyz;
        gl_Position = uProjection * pos;
      }
    `;

    const fsSource = `
      precision mediump float;

      varying vec2 vTexCoord;
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      uniform sampler2D uSampler;

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);

        // Directional Sun Light from Top-Left-Front
        vec3 lightDir = normalize(vec3(0.7, 0.4, 0.9));
        float diff = max(dot(normal, lightDir), 0.0);
        float ambient = 0.18;
        float lighting = ambient + diff * 0.88;

        vec4 texColor = texture2D(uSampler, vTexCoord);

        // Earth Atmospheric Rim Glow (Sage / Emerald Haze)
        float rim = 1.0 - max(dot(normal, viewDir), 0.0);
        vec3 atmosphere = vec3(0.55, 0.85, 0.65) * pow(rim, 2.6) * 0.65;

        vec3 finalColor = (texColor.rgb * lighting) + atmosphere;
        gl_FragColor = vec4(finalColor, texColor.a);
      }
    `;

    function createShader(glCtx: WebGLRenderingContext, type: number, source: string) {
      const shader = glCtx.createShader(type);
      if (!shader) return null;
      glCtx.shaderSource(shader, source);
      glCtx.compileShader(shader);
      if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
        glCtx.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Build UV Sphere Geometry
    const latitudeBands = 44;
    const longitudeBands = 44;
    const radius = 1.0;

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let lat = 0; lat <= latitudeBands; lat++) {
      const theta = (lat * Math.PI) / latitudeBands;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let lon = 0; lon <= longitudeBands; lon++) {
        const phi = (lon * 2 * Math.PI) / longitudeBands;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        const x = cosPhi * sinTheta;
        const y = cosTheta;
        const z = sinPhi * sinTheta;
        const u = 1 - lon / longitudeBands;
        const v = 1 - lat / latitudeBands;

        normals.push(x, y, z);
        uvs.push(u, v);
        positions.push(radius * x, radius * y, radius * z);
      }
    }

    for (let lat = 0; lat < latitudeBands; lat++) {
      for (let lon = 0; lon < longitudeBands; lon++) {
        const first = lat * (longitudeBands + 1) + lon;
        const second = first + longitudeBands + 1;
        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }

    // Buffers
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(program, 'aPosition');
    const aNormal = gl.getAttribLocation(program, 'aNormal');
    const aTexCoord = gl.getAttribLocation(program, 'aTexCoord');

    gl.enableVertexAttribArray(aPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(aNormal);
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(aTexCoord);
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);

    // Uniforms
    const uProjection = gl.getUniformLocation(program, 'uProjection');
    const uModelView = gl.getUniformLocation(program, 'uModelView');
    const uSampler = gl.getUniformLocation(program, 'uSampler');

    // Load Earth Texture
    const texture = gl.createTexture();
    const textureImage = new Image();
    textureImage.crossOrigin = 'anonymous';
    textureImage.src = '/earth-globe.jpg';

    // Temporary 1x1 placeholder while image loads
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([10, 28, 45, 255])
    );

    textureImage.onload = () => {
      if (!gl) return;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureImage);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };

    gl.enable(gl.DEPTH_TEST);
    gl.viewport(0, 0, size, size);

    // Perspective Matrix
    const fov = (40 * Math.PI) / 180;
    const aspect = 1.0;
    const zNear = 0.1;
    const zFar = 100.0;
    const f = 1.0 / Math.tan(fov / 2);

    const projMatrix = new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (zFar + zNear) / (zNear - zFar), -1,
      0, 0, (2 * zFar * zNear) / (zNear - zFar), 0,
    ]);

    let rotationAngle = 0.8;
    let isDragging = false;
    let prevMouseX = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      rotationAngle += deltaX * 0.006;
      prevMouseX = e.clientX;
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Render Loop (Smooth 60fps axial rotation)
    const render = () => {
      if (!gl) return;

      if (!isDragging) {
        rotationAngle += 0.0022; // Continual slow rotation
      }

      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // ModelView Matrix: Camera at Z = -2.8, slight axial tilt 23.5 deg
      const cosY = Math.cos(rotationAngle);
      const sinY = Math.sin(rotationAngle);
      const tilt = (14 * Math.PI) / 180;
      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);

      const modelViewMatrix = new Float32Array([
        cosY, sinY * sinT, -sinY * cosT, 0,
        0, cosT, sinT, 0,
        sinY, -cosY * sinT, cosY * cosT, 0,
        0, 0, -2.75, 1,
      ]);

      gl.uniformMatrix4fv(uProjection, false, projMatrix);
      gl.uniformMatrix4fv(uModelView, false, modelViewMatrix);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uSampler, 0);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
      style={{
        width: size,
        height: size,
        cursor: 'grab',
        userSelect: 'none',
      }}
    />
  );
}
