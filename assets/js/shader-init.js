// Ждем, пока вся страница загрузится
window.addEventListener('load', function() {
    // Находим наш <canvas> элемент
    var canvas = document.getElementById('shader-canvas');
    if (!canvas) {
        console.error("Canvas element not found!");
        return;
    }

    // Инициализируем библиотеку glsl-canvas
    var sandbox = new GlslCanvas(canvas);

    // Устанавливаем размер canvas на весь экран
    // и следим за изменением размера окна
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas, false);
    resizeCanvas(); // Устанавливаем размер сразу

    // --- СЮДА ВСТАВЛЯЕТСЯ КОД ШЕЙДЕРА С SHADERTOY ---
    // Я взял для примера простой и красивый шейдер "Star Nest"
    // Вы можете заменить его на любой другой
    const shaderCode = `
#ifdef GL_ES
precision mediump float;
#endif

// Атрибуты, передаваемые из JavaScript
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

// Настройки
const int iterations = 17;
const float formuparam = 0.53;
const int volsteps = 20;
const float stepsize = 0.1;
const float zoom = 0.800;
const float tile = 0.850;
const float speed = 0.010;
const float brightness = 0.0015;
const float darkmatter = 0.300;
const float distfading = 0.730;
const float saturation = 0.850;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy - 0.5;
    uv.y *= u_resolution.y / u_resolution.x;
    vec3 dir = vec3(uv * zoom, 1.);
    float time = u_time * speed + 0.25;

    float a1 = 0.5 + u_mouse.x / u_resolution.x * 2.;
    float a2 = 0.8 + u_mouse.y / u_resolution.y * 2.;
    mat2 rot1 = mat2(cos(a1), sin(a1), -sin(a1), cos(a1));
    mat2 rot2 = mat2(cos(a2), sin(a2), -sin(a2), cos(a2));
    dir.xz *= rot1;
    dir.xy *= rot2;
    vec3 from = vec3(1., 0.5, 0.5);
    from += vec3(time * 2., time, -2.);
    from.xz *= rot1;
    from.xy *= rot2;
    
    float s = 0.1, fade = 1.;
    vec3 v = vec3(0.);
    for (int r = 0; r < volsteps; r++) {
        vec3 p = from + s * dir * 0.5;
        p = abs(vec3(tile) - mod(p, vec3(tile * 2.)));
        float pa, a = pa = 0.;
        for (int i = 0; i < iterations; i++) {
            p = abs(p) / dot(p, p) - formuparam;
            a += abs(length(p) - pa);
            pa = length(p);
        }
        float dm = max(0., darkmatter - a * a * 0.001);
        a *= a * a;
        if (r > 6) fade *= 1. - dm;
        v += fade;
        v += vec3(s, s * s, s * s * s * s) * a * brightness * fade;
        fade *= distfading;
        s += stepsize;
    }
    v = mix(vec3(length(v)), v, saturation);
    gl_FragColor = vec4(v * 0.01, 1.);
}
    `;

    // Загружаем код шейдера в наш canvas
    sandbox.load(shaderCode);
});