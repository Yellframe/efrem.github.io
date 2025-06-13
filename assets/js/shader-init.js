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
#version 320 es

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 resolution;
uniform float time;
uniform vec4 mouse;
uniform vec4 date;

#define iTime time

#define A 9. // amplitude
#define T (iTime/3e2)
#define H(a) (cos(radians(vec3(180, 90, 0))+(a)*6.2832)*.5+.5)  // hue

float map(vec3 u, float v)  // sdf
{
    float t = T,     // speed
          l = 5.,    // loop to reduce clipping
          f = 1e10, i = 0., y, z;

    u.xy = vec2(atan(u.x, u.y), length(u.xy));  // polar transform
    u.x += t*v*3.1416*.7;  // counter rotation

    for (; i++<l;)
    {
        vec3 p = u;
        y = round((p.y-i)/l)*l+i;
        p.x *= y;
        p.x -= y*y*t*3.1416;
        p.x -= round(p.x/6.2832)*6.2832;
        p.y -= y;
        z = cos(y*t*6.2832)*.5+.5;  // z wave
        f = min(f, max(length(p.xy), -p.z-z*A) -.1 -z*.2 -p.z/1e2);  // tubes
    }
    return f;
}

void mainImage( out vec4 C, vec2 U )
{
    vec2 R = resolution.xy, j,
         m = (mouse.xy - R/2.)/R.y;

    if (mouse.z < 1. && mouse.x+mouse.y < 10.) m = vec2(0, .5);

    vec3 o = vec3(0, 0, -130.),  // camera
         u = normalize(vec3(U - R/2., R.y)),  // 3d coords
         c = vec3(0),
         p, k;

    float t = T,
          v = -o.z/3.,  // pattern scale
          i = 0., d = i,
          s, f, z, r;

    bool b;

    for (; i++<70.;)  // raymarch
    {
        p = u*d + o;
        p.xy /= v;           // scale down
        r = length(p.xy);    // radius
        z = abs(1.-r*r);     // z warp
        b = r < 1.;          // inside?
        if (b) z = sqrt(z);
        p.xy /= z+1.;        // spherize
        p.xy -= m;           // move with mouse
        p.xy *= v;           // scale back up
        p.xy -= cos(p.z/8. +t*3e2 +vec2(0, 1.5708) +z/2.)*.2;  // wave along z

        s = map(p, v);  // sdf

        r = length(p.xy);                  // new r
        f = cos(round(r)*t*6.2832)*.5+.5;  // multiples
        k = H(.2 -f/3. +t +p.z/2e2);       // color
        if (b) k = 1.-k;                   // flip color

        // this stuff can go outside the raymarch,
        // but accumulating it here produces softer edges
        c += min(exp(s/-.05), s)        // shapes
           * (f+.01)                    // shade pattern
           * min(z, 1.)                 // darken edges
           * sqrt(cos(r*6.2832)*.5+.5)  // shade between rows
           * k*k;                       // color

        if (s < 1e-3 || d > 1e3) break;
        d += s*clamp(z, .2, .9);  // smaller steps towards sphere edge
    }

    //c += texture(iChannel0, u*d + o).rrr * vec3(0, .4, s)*s*z*.03;  // wavy aqua
    c += min(exp(-p.z-f*A)*z*k*.01/s, 1.);  // light tips

    j = p.xy/v+m;  // 2d coords
    c /= clamp(dot(j, j)*4., .04, 4.);  // brightness

    C = vec4(exp(log(c)/2.2), 1);
}

out vec4 FragmentColor;

void main() {
 vec4 fragment_color;
 mainImage(fragment_color, gl_FragCoord.xy);
 FragmentColor = fragment_color;
}

    `;

    // Загружаем и компилируем код шейдера
    sandbox.load(shaderCode);
});
