// Ждем, пока вся страница загрузится, чтобы все элементы были на месте
window.addEventListener('load', function() {
    // Находим наш <canvas> элемент по его ID
    var canvas = document.getElementById('shader-canvas');
    
    // Если элемент не найден, выводим ошибку в консоль и прекращаем работу
    if (!canvas) {
        console.error("Элемент <canvas> с ID 'shader-canvas' не найден! Проверьте index.html");
        return;
    }

    // Инициализируем библиотеку glsl-canvas на нашем элементе
    var sandbox = new GlslCanvas(canvas);

    // Эта функция отвечает за установку размера canvas
    function resizeCanvas() {
        // Устанавливаем ширину canvas равной текущей ширине окна браузера
        canvas.width = window.innerWidth;
        // Устанавливаем высоту canvas равной текущей высоте окна браузера
        canvas.height = window.innerHeight;
        // Важно: сообщаем glsl-canvas, что размер изменился, чтобы он перерисовал шейдер корректно
        sandbox.setUniform('u_resolution', canvas.width, canvas.height);
    }
    
    // Добавляем "слушателя" события: как только размер окна изменится,
    // будет вызвана функция resizeCanvas, и фон адаптируется.
    window.addEventListener('resize', resizeCanvas, false);
    
    // Вызываем функцию один раз при загрузке, чтобы установить начальный размер
    resizeCanvas();

    // --- КОД ВАШЕГО ШЕЙДЕРА ---
    // Вы можете вставить сюда любой код с сайта Shadertoy.
    // Я оставил тот, что был у вас (Star Nest).
    const shaderCode = `
#ifdef GL_ES
precision mediump float;
#endif

// Атрибуты, которые glsl-canvas передает в шейдер автоматически:
// u_time - время в секундах, прошедшее с начала анимации
// u_resolution - разрешение canvas (например, 1920.0, 1080.0)
// u_mouse - координаты мыши (x, y)
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

// Настройки для шейдера "Star Nest"
const int iterations = 17;
const float formuparam = 0.53;
const int volsteps = 20;
const float stepsize = 0.1;
const float zoom = 0.200;
const float tile = 0.850;
const float speed = 0.010;
const float brightness = 0.0015;
const float darkmatter = 0.300;
const float distfading = 0.730;
const float saturation = 0.850;

void main() {
    // Преобразуем координаты пикселя в систему от -0.5 до 0.5
    vec2 uv = gl_FragCoord.xy / u_resolution.xy - 0.5;
    uv.y *= u_resolution.y / u_resolution.x; // Компенсация соотношения сторон
    vec3 dir = vec3(uv * zoom, 1.);
    float time = u_time * speed + 0.25;

    // Вращение в зависимости от положения мыши
    float a1 = 0.1 + u_mouse.x / u_resolution.x * 2.;
    float a2 = 0.1 + u_mouse.y / u_resolution.y * 2.;
    mat2 rot1 = mat2(cos(a1), sin(a1), -sin(a1), cos(a1));
    mat2 rot2 = mat2(cos(a2), sin(a2), -sin(a2), cos(a2));
    dir.xz *= rot1;
    dir.xy *= rot2;
    
    // Движение камеры
    vec3 from = vec3(1., 0.5, 0.5);
    from += vec3(time * 2., time, -2.);
    from.xz *= rot1;
    from.xy *= rot2;
    
    // Рендеринг туманности
    float s = 0.1, fade = 1.;
    vec3 v = vec3(0.);
    for (int r = 0; r < volsteps; r++) {
        vec3 p = from + s * dir * 0.5;
        p = abs(vec3(tile) - mod(p, vec3(tile * 2.))); // Тайлинг
        float pa, a = pa = 0.;
        for (int i = 0; i < iterations; i++) { // Фрактальная часть
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
    v = mix(vec3(length(v)), v, saturation); // Насыщенность
    gl_FragColor = vec4(v * 0.01, 1.); // Итоговый цвет пикселя
}
    `;

    // Загружаем и компилируем код шейдера
    sandbox.load(shaderCode);
});
