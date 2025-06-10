class ShaderBackground {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
    
    // [ИСПРАВЛЕНО] Добавлена проверка поддержки WebGL
    if (!this.gl) {
      console.error("WebGL not supported");
      return;
    }

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
    // Вершинный шейдер (без изменений)
    const vertShader = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    // Фрагментный шейдер (исправленная версия)
    const fragShader = `
      precision highp float;
      uniform float time;
      uniform vec2 resolution;

      // [ИСПРАВЛЕНО] Удалены зависимости от iChannel0 и iMouse
      float t;

      float cosPath(vec3 p, vec3 dec) { return dec.x * cos(p.z * dec.y + dec.z); }
      float sinPath(vec3 p, vec3 dec) { return dec.x * sin(p.z * dec.y + dec.z); }

      vec2 getCylinder(vec3 p, vec2 pos, float r, vec3 c, vec3 s) {
        return p.xy - pos - vec2(cosPath(p, c), sinPath(p, s));
      }

      // [ИСПРАВЛЕНО] Заменена функция pn на случайный шум
      float random(vec3 p) {
        return fract(sin(dot(p, vec3(12.9898, 78.233, 54.53))) * 43758.5453;
      }

      float fpn(vec3 p) {
        p += t*5.;
        return random(p*0.02)*1.98 + random(p*0.02)*0.62 + random(p*0.09)*0.39;
      }

      float map(vec3 p) {
        float pnNoise = fpn(p*13.)*.8;
        float path = sinPath(p, vec3(6.2, .33, 0.));
        float bottom = p.y + pnNoise;
        float cyl = 0.;
        vec2 vecOld;
        
        for (float i=0.; i<6.; i++) {
          float x = 1. * i;
          float y = .88 + 0.0102*i;
          float z = -0.02 -0.16*i;
          float r = 4.4 + 2.45 * i;
          vec2 vec = getCylinder(p, vec2(path, 3.7 * i), r, vec3(x,y,z), vec3(z,x,y));
          cyl = r - min(length(vec), length(vecOld));
          vecOld = vec;	
        }
        cyl += pnNoise;
        cyl = min(cyl, bottom);
        return cyl;
      }

      vec3 cam(vec2 uv, vec3 ro, vec3 cu, vec3 cv) {
        vec3 rov = normalize(cv-ro);
        vec3 u = normalize(cross(cu, rov));
        vec3 v = normalize(cross(rov, u));
        float fov = 3.;
        vec3 rd = normalize(rov + fov*u*uv.x + fov*v*uv.y);
        return rd;
      }

      void main() {
        t = time*2.5;
        vec4 f = vec4(0,0.15,0.32,1);
        vec2 si = resolution.xy;
        vec2 uv = (2.*gl_FragCoord.xy-si)/min(si.x, si.y);
        vec3 ro = vec3(0), p=ro;
        ro.y = sin(t*.2)*15.+15.;
        ro.x = sin(t*.5)*5.;
        ro.z = t*5.;
        vec3 rd = cam(uv, p, vec3(0,1,0), p + vec3(0,0,1));
        float s = 1., h = .15, td = 0., d=1., dd=0., w;
        
        for(float i=0.; i<200.; i++) {      
          if(s<0.01||d>500.||td>.95) break;
          s = map(p) * 0.03;
          if (s < h) {
            w = (1.-td) * (h-s)*i/200.;
            f += w;
            td += w;
          }
          dd += 0.012;
          td += 0.005;
          s = max(s, 0.05);
          d += s;	
          p = ro+rd*d;	
        }
        
        f.rgb = mix(f.rgb, vec3(0,0.15,0.52), 1.0 - exp(-0.001*d*d))/dd;
        
        // [ИСПРАВЛЕНО] Упрощенный вариант виньетирования
        vec2 q = gl_FragCoord.xy/resolution;
        f.rgb *= 0.5 + 0.5*pow(16.0*q.x*q.y*(1.0-q.x)*(1.0-q.y), 0.25);
        
        gl_FragColor = f;
      }
    `;

    // Компиляция шейдеров (без изменений)
    const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    this.gl.shaderSource(vertexShader, vertShader);
    this.gl.compileShader(vertexShader);

    const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    this.gl.shaderSource(fragmentShader, fragShader);
    this.gl.compileShader(fragmentShader);

    // Проверка ошибок компиляции
    if (!this.gl.getShaderParameter(vertexShader, this.gl.COMPILE_STATUS)) {
      console.error("Vertex shader error:", this.gl.getShaderInfoLog(vertexShader));
    }
    
    if (!this.gl.getShaderParameter(fragmentShader, this.gl.COMPILE_STATUS)) {
      console.error("Fragment shader error:", this.gl.getShaderInfoLog(fragmentShader));
    }

    // Создание программы
    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);
    
    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error("Program linking error:", this.gl.getProgramInfoLog(this.program));
    }
    
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
    // [ИСПРАВЛЕНО] Оптимизация для мобильных устройств
    const density = window.devicePixelRatio > 1 ? 0.8 : 1;
    this.canvas.width = window.innerWidth * density;
    this.canvas.height = window.innerHeight * density;
    
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    
    if (this.program) {
      const resolutionUniform = this.gl.getUniformLocation(this.program, "resolution");
      this.gl.uniform2f(resolutionUniform, this.canvas.width, this.canvas.height);
    }
  }

  render(time = 0) {
    if (!this.gl || !this.program) return;
    
    this.gl.uniform1f(this.timeUniform, time * 0.001);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(this.render.bind(this));
  }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  new ShaderBackground();
});