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
// Предположим, что у вас уже есть сцена Three.js, камера и рендерер.
// Например:
// const scene = new THREE.Scene();
// const camera = new THREE.OrthographicCamera( -1, 1, 1, -1, 0, 1 );
// const renderer = new THREE.WebGLRenderer();
// document.body.appendChild( renderer.domElement );
// renderer.setSize( window.innerWidth, window.innerHeight );

// Шаг 1: Загрузка текстуры для iChannel0
// Для iChannel0 на ShaderToy часто используется Perlin Noise текстура.
// В Three.js вы можете загрузить свою или сгенерировать.
// Для примера, возьмем что-то похожее на ту, что на ShaderToy (Perlin Noise)
// Это URL для общей текстуры шума, которую можно найти в интернете или сгенерировать.
// Если у вас есть своя, используйте ее URL.
const textureLoader = new THREE.TextureLoader();
let noiseTexture;

// Важно: Эта текстура должна быть доступна по указанному пути.
// Для ShaderToy's iChannel0 (Buffer A), часто используется это изображение:
// https://www.shadertoy.com/media/a/img/channel0.png
// Если это не ваша текстура, то нужно найти подходящую.
// Если у вас нет этой текстуры, можете создать простую черную текстуру-заглушку
// или рассмотреть возможность программной генерации шума, если это возможно в вашем случае.
textureLoader.load('https://www.shadertoy.com/media/a/img/channel0.png', (texture) => {
    noiseTexture = texture;
    noiseTexture.wrapS = THREE.RepeatWrapping;
    noiseTexture.wrapT = THREE.RepeatWrapping;
    initShader(); // Инициализируем шейдер после загрузки текстуры
}, undefined, (err) => {
    console.error('An error occurred loading the noise texture:', err);
    // В случае ошибки загрузки, можно использовать заглушку или пропустить текстуру.
    // Для этого примера, если текстура не загрузилась, шейдер может не работать корректно.
    // Можно, например, инициализировать texture как new THREE.Texture() и выдать предупреждение.
});

// Глобальные переменные для шейдера
let shaderMaterial;
let planeMesh;
const clock = new THREE.Clock(); // Для iTime

function initShader() {
    // Проверка, что текстура загружена
    if (!noiseTexture) {
        console.error("Noise texture not loaded. Cannot initialize shader.");
        return;
    }

    // Vertex Shader (Простой, для полноэкранного квадрата)
    const vertexShader = `
        void main() {
            gl_Position = vec4( position, 1.0 );
        }
    `;

    // Fragment Shader (ваш преобразованный код)
    const fragmentShader = `
        uniform float iTime;
        uniform vec3 iResolution;
        uniform vec4 iMouse;
        uniform sampler2D iChannel0; // Для Perlin Noise текстуры

        float t;

        float cosPath(vec3 p, vec3 dec){return dec.x * cos(p.z * dec.y + dec.z);}
        float sinPath(vec3 p, vec3 dec){return dec.x * sin(p.z * dec.y + dec.z);}

        vec2 getCylinder(vec3 p, vec2 pos, float r, vec3 c, vec3 s)
        {
            return p.xy - pos - vec2(cosPath(p, c), sinPath(p, s));
        }

        /////////////////////////
        // FROM Shader Cloudy spikeball from duke : https://www.shadertoy.com/view/MljXDw
        float pn( in vec3 x )
        {
            vec3 p = floor(x);
            vec3 f = fract(x);
            f = f*f*(3.0-2.0*f);
            vec2 uv = (p.xy+vec2(37.0,17.0)*p.z) + f.xy;
            // textureLod requires WebGL2. If using WebGL1, use texture2D.
            // textureLod might be faster if mipmaps are pre-calculated for texture.
            // For simplicity, we'll use texture2D for broad compatibility.
            // If you specifically need textureLod and WebGL2, enable it.
            // If the texture is not setup with mipmaps, textureLod might behave like texture2D.
            vec2 rg = texture2D(iChannel0, (uv + 0.5)/256.0 ).yx;
            return -1.0+2.4*mix( rg.x, rg.y, f.z );
        }

        float fpn(vec3 p)
        {
            p += t*5.;
            return pn(p*0.02)*1.98 + pn(p*0.02)*0.62 + pn(p*0.09)*0.39;
        }
        /////////////////////////

        float map(vec3 p)
        {
            float pnNoise = fpn(p*13.)*.8;
            float path = sinPath(p ,vec3(6.2, .33, 0.));
            float bottom = p.y + pnNoise;
            float cyl = 0.;vec2 vecOld;
            for (float i=0.;i<6.;i++)
            {
                float x = 1. * i;
                float y    = .88 + 0.0102*i;
                float z     = -0.02 -0.16*i;
                float r = 4.4 + 2.45 * i;
                vec2 vec = getCylinder(p, vec2(path, 3.7 * i), r , vec3(x,y,z), vec3(z,x,y));
                // Инициализация vecOld для первой итерации:
                // Если vecOld не инициализирован, длина будет неопределенной.
                // Присвоим ему vec для первой итерации, чтобы min работал корректно.
                if (i == 0.0) {
                    vecOld = vec;
                }
                cyl = r - min(length(vec), length(vecOld));
                vecOld = vec;
            }
            cyl += pnNoise;
            cyl = min(cyl, bottom);
            return cyl;
        }

        vec3 cam(vec2 uv, vec3 ro, vec3 cu, vec3 cv)
        {
            vec3 rov = normalize(cv-ro);
            vec3 u =  normalize(cross(cu, rov));
            vec3 v =  normalize(cross(rov, u));
            float fov = 3.;
            vec3 rd = normalize(rov + fov*u*uv.x + fov*v*uv.y);
            return rd;
        }

        void main() // Изменено с mainImage на main
        {
            // Получаем координаты фрагмента (аналог g в ShaderToy)
            vec2 fragCoord = gl_FragCoord.xy;

            t = iTime*2.5;
            vec4 fragColor = vec4(0,0.15,0.32,1); // Изменено с f на fragColor
            vec2 si = iResolution.xy;
            vec2 uv = (2.*fragCoord-si)/min(si.x, si.y); // Изменено с g на fragCoord
            vec3 ro = vec3(0), p=ro;
            ro.y = sin(t*.2)*15.+15.;
            ro.x = sin(t*.5)*5.;
            ro.z = t*5.;
            vec3 rd = cam(uv, p, vec3(0,1,0), p + vec3(0,0,1));
            float s = 1., h = .15, td = 0., d=1.,dd=0., w;
            float var = 0.03;
            if (iMouse.z > 0.0) var = 0.1 * iMouse.y / iResolution.y; // Сравниваем с 0.0
            for(float i=0.;i<200.;i++)
            {
                if(s<0.01||d>500.||td>0.95) break; // Сравниваем с 0.01 и 0.95
                s = map(p) * (s>0.001?var:0.2); // Сравниваем с 0.001
                if (s < h)
                {
                    w = (1.-td) * (h-s)*i/200.;
                    fragColor += w; // Изменено с f на fragColor
                    td += w;
                }
                dd += 0.012;
                td += 0.005;
                s = max(s, 0.05);
                d+=s;
                p = ro+rd*d;
            }
            fragColor.rgb = mix( fragColor.rgb, vec3(0,0.15,0.52), 1.0 - exp( -0.001*d*d) )/dd; // fog

            // vigneting from iq Shader Mike : https://www.shadertoy.com/view/MsXGWr
            vec2 q = fragCoord/si; // Изменено с g на fragCoord
            fragColor.rgb *= 0.5 + 0.5*pow( 16.0*q.x*q.y*(1.0-q.x)*(1.0-q.y), 0.25 );

            gl_FragColor = fragColor; // Присваиваем результат gl_FragColor
        }
    `;

    // Инициализация униформ
    const uniforms = {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector3() },
        iMouse: { value: new THREE.Vector4(0, 0, 0, 0) },
        iChannel0: { value: noiseTexture } // Передаем загруженную текстуру
    };

    // Создание шейдерного материала
    shaderMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader
    });

    // Создание полноэкранной плоскости
    const planeGeometry = new THREE.PlaneGeometry(2, 2); // 2x2 для растяжения по экрану
    planeMesh = new THREE.Mesh(planeGeometry, shaderMaterial);
    scene.add(planeMesh);

    // Обработчик изменения размера окна
    window.addEventListener('resize', onWindowResize);
    onWindowResize(); // Вызываем один раз для установки начального разрешения

    // Обработчик движения мыши
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    // Запуск анимационного цикла
    animate();
}


function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    shaderMaterial.uniforms.iResolution.value.set(width, height, 1);
}

function onMouseMove(event) {
    shaderMaterial.uniforms.iMouse.value.x = event.clientX;
    shaderMaterial.uniforms.iMouse.value.y = event.clientY;
}

function onMouseDown(event) {
    if (event.button === 0) { // Left mouse button
        shaderMaterial.uniforms.iMouse.value.z = event.clientX; // Store x on click
        shaderMaterial.uniforms.iMouse.value.w = event.clientY; // Store y on click
    }
}

function onMouseUp(event) {
    if (event.button === 0) { // Left mouse button
        shaderMaterial.uniforms.iMouse.value.z = 0; // Reset z to 0 on mouse up
        shaderMaterial.uniforms.iMouse.value.w = 0; // Reset w to 0 on mouse up
    }
}


function animate() {
    requestAnimationFrame(animate);

    // Обновляем iTime
    shaderMaterial.uniforms.iTime.value = clock.getElapsedTime();

    renderer.render(scene, camera);
}

// Если вы не используете Three.js, то вам нужно будет самостоятельно
// создать WebGL контекст, скомпилировать шейдеры и настроить буферы.
// Пример для инициализации Three.js (поместите это до initShader)
const scene = new THREE.Scene();
const camera = new THREE.THREE.OrthographicCamera( -1, 1, 1, -1, 0, 1 ); // Ортогональная камера для 2D шейдера
const renderer = new THREE.WebGLRenderer({ antialias: true }); // Включение сглаживания
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

    // Загружаем и компилируем код шейдера
    sandbox.load(shaderCode);
});
