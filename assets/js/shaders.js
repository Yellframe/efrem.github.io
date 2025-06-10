class ShaderBackground {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
    this.program = null;
    this.timeUniform = null;
    this.resizeTimeout = null;
    
    this.initCanvas();
    this.initShader();
    this.bindEvents();
    this.render();
  }

  initCanvas() {
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.zIndex = '-1';
    document.body.appendChild(this.canvas);
    this.resize();
  }

  initShader() {
    // Вершинный шейдер (стандартный)
    const vertShader = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    // Фрагментный шейдер (из Shadertoy)
    const fragShader = mainImage
      precision highp float;
      uniform float time;
      uniform vec2 resolution;

      void mainImage(out vec4 fragColor, in vec2 fragCoord) {
        vec2 uv = fragCoord/resolution.xy;
        uv -= 0.5;
        uv.x *= resolution.x/resolution.y;
        
        float d = length(uv);
        float c = smoothstep(0.3, 0.29, d);
        
        vec3 col = vec3(c);
        col.r += sin(time*0.5 + uv.x*2.0)*0.5 + 0.5;
        col.g += cos(time*0.3 + uv.y*3.0)*0.5 + 0.5;
        col.b += sin(time*0.7 + (uv.x+uv.y)*5.0)*0.5 + 0.5;
        
        fragColor = vec4(col, 1.0);
      }

      void main() {
        mainImage(gl_FragColor, gl_FragCoord.xy);
      }
    

    // Компиляция шейдеров
    const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    this.gl.shaderSource(vertexShader, vertShader);
    this.gl.compileShader(vertexShader);

    const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    this.gl.shaderSource(fragmentShader, fragShader);
    this.gl.compileShader(fragmentShader);

    // Создание программы
    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);
    this.gl.useProgram(this.program);

    // Создание буфера
    const buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), this.gl.STATIC_DRAW);

    // Атрибуты
    const position = this.gl.getAttribLocation(this.program, "position");
    this.gl.enableVertexAttribArray(position);
    this.gl.vertexAttribPointer(position, 2, this.gl.FLOAT, false, 0, 0);

    // Юниформы
    this.timeUniform = this.gl.getUniformLocation(this.program, "time");
    const resolutionUniform = this.gl.getUniformLocation(this.program, "resolution");
    this.gl.uniform2f(resolutionUniform, this.canvas.width, this.canvas.height);
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => this.resize(), 100);
    });
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    const resolutionUniform = this.gl.getUniformLocation(this.program, "resolution");
    this.gl.uniform2f(resolutionUniform, this.canvas.width, this.canvas.height);
  }

  render(time = 0) {
    this.gl.uniform1f(this.timeUniform, time * 0.001);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(this.render.bind(this));
  }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  new ShaderBackground();
});

if (!this.gl) {
  console.error("WebGL not supported");
  return;
}

resize() {
  const density = window.devicePixelRatio > 1 ? 1 : 1;
  this.canvas.width = window.innerWidth * density;
  this.canvas.height = window.innerHeight * density;
  // ... остальной код
}