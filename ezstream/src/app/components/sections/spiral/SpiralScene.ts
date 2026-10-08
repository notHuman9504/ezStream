import * as THREE from "three"

type SpiralSceneOptions = {
  // One painted canvas per card design; cards cycle through them.
  textures: HTMLCanvasElement[]
  reducedMotion: boolean
  // Fires when the card nearest the front center changes (index into textures).
  onActiveChange: (design: number | null) => void
}

// Cards wound around a cylinder that keeps turning, like a screw seen from the
// side. The helix is sheared sideways so it runs corner to corner while the cards
// stay upright. Each card is bent onto the cylinder and skewed along the helix,
// and cards further from the camera are dimmed and blurred.
export class SpiralScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100)
  private helix = new THREE.Group()
  private cards: Card[] = []
  private textures: THREE.CanvasTexture[]
  private frame = 0
  private running = false
  private last = 0
  // Position along the helix, in cards. Idle drift and scroll both feed it.
  private idle = 0
  private scrollTarget = 0
  private phase = 0
  private velocity = 0
  private pointer = new THREE.Vector2(0, 0)
  private parallax = new THREE.Vector2(0, 0)
  private active: number | null = null
  private shear = 0
  private readonly scratch = new THREE.Vector3()

  constructor(private canvas: HTMLCanvasElement, private options: SpiralSceneOptions) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))

    this.textures = options.textures.map(source => {
      const texture = new THREE.CanvasTexture(source)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy()
      texture.minFilter = THREE.LinearMipmapLinearFilter
      texture.generateMipmaps = true
      return texture
    })

    const geometry = new THREE.PlaneGeometry(CARD_W, CARD_H, 32, 1)
    for (let i = 0; i < CARD_COUNT; i++) {
      const design = i % this.textures.length
      const material = new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: true,
        extensions: { derivatives: true } as THREE.ShaderMaterial["extensions"],
        uniforms: {
          uMap: { value: this.textures[design] },
          uTheta: { value: 0 },
          uY: { value: 0 },
          uRadius: { value: RADIUS },
          uSlope: { value: PITCH / (STEP * RADIUS) },
          uShear: { value: 0 },
          uAspect: { value: CARD_W / CARD_H },
          uCorner: { value: CORNER },
          uFade: { value: 1 },
          uFocus: { value: 0 },
          uSpread: { value: 1 },
          uVelocity: { value: 0 },
        },
      })
      const mesh = new THREE.Mesh(geometry, material)
      // Vertices are placed in the shader, so the geometry's own bounds are meaningless.
      mesh.frustumCulled = false
      this.helix.add(mesh)
      this.cards.push({ mesh, material, design })
    }
    this.scene.add(this.helix)
  }

  // Scroll progress through the section, 0 to 1.
  setScroll(progress: number) {
    this.scrollTarget = progress * SCROLL_CARDS
  }

  // Pointer in normalized device coordinates, for a slight parallax.
  setPointer(x: number, y: number) {
    this.pointer.set(x, y)
  }

  resize(width: number, height: number) {
    if (!width || !height) return
    this.renderer.setSize(width, height, false)
    const aspect = width / height
    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()

    // 0 on tall screens, 1 on wide ones. The sweep follows the screen's diagonal,
    // and wide screens show the front of the helix a little closer.
    const t = THREE.MathUtils.clamp((aspect - 0.6) / 1.2, 0, 1)
    this.helix.rotation.set(TILT_X, 0, 0)
    this.shear = THREE.MathUtils.lerp(SHEAR_TALL, SHEAR_WIDE, t)
    const viewHeight = THREE.MathUtils.lerp(VIEW_HEIGHT_TALL, VIEW_HEIGHT_WIDE, t)

    const halfTan = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
    const distance = RADIUS + Math.max(viewHeight / 2 / halfTan, VIEW_WIDTH / 2 / aspect / halfTan)
    this.camera.position.set(0, 0, distance)
    this.camera.lookAt(0, 0, 0)

    const focus = distance - RADIUS
    for (const card of this.cards) {
      card.material.uniforms.uFocus.value = focus + 0.6
      card.material.uniforms.uSpread.value = RADIUS * 2
      card.material.uniforms.uShear.value = this.shear
    }
    if (!this.running) this.render(0)
  }

  start() {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    this.frame = requestAnimationFrame(this.tick)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.frame)
  }

  dispose() {
    this.stop()
    this.cards.forEach(card => card.material.dispose())
    this.cards[0]?.mesh.geometry.dispose()
    this.textures.forEach(texture => texture.dispose())
    this.renderer.dispose()
  }

  private tick = (now: number) => {
    if (!this.running) return
    const dt = Math.min((now - this.last) / 1000, 0.1)
    this.last = now
    this.render(dt)
    this.frame = requestAnimationFrame(this.tick)
  }

  private render(dt: number) {
    const { reducedMotion } = this.options
    if (!reducedMotion) this.idle += dt * IDLE_SPEED

    // Ease toward the target like a smooth-scroll library would.
    const target = this.idle + this.scrollTarget
    const previous = this.phase
    this.phase = reducedMotion ? target : this.phase + (target - this.phase) * (1 - Math.exp(-dt * EASE))
    const speed = dt > 0 ? Math.abs(this.phase - previous) / dt : 0
    this.velocity += (speed - this.velocity) * (1 - Math.exp(-dt * 8))
    const motionBlur = reducedMotion ? 0 : THREE.MathUtils.clamp((this.velocity - IDLE_SPEED) * 0.12, 0, 0.6)

    this.parallax.lerp(this.pointer, 1 - Math.exp(-dt * 3))
    this.camera.position.x = this.parallax.x * PARALLAX
    this.camera.position.y = this.parallax.y * PARALLAX
    this.camera.lookAt(0, 0, 0)
    this.helix.updateMatrixWorld()

    const half = CARD_COUNT / 2
    const order: { card: Card; depth: number }[] = []
    let best: { design: number; score: number } | null = null

    for (let i = 0; i < CARD_COUNT; i++) {
      const card = this.cards[i]
      // Wrap so cards leaving one end come back in at the other, out of sight.
      const t = ((((i + this.phase) % CARD_COUNT) + CARD_COUNT) % CARD_COUNT) - half
      const theta = t * STEP
      const y = t * PITCH
      const u = card.material.uniforms
      u.uTheta.value = theta
      u.uY.value = y
      u.uFade.value = 1 - THREE.MathUtils.smoothstep(Math.abs(t), half - 3, half - 0.5)
      u.uVelocity.value = motionBlur

      this.scratch
        .set(RADIUS * Math.sin(theta) + y * this.shear, y, RADIUS * Math.cos(theta))
        .applyMatrix4(this.helix.matrixWorld)
      const depth = this.camera.position.distanceTo(this.scratch)
      order.push({ card, depth })

      // Front-facing cards near the middle of the screen compete to be "active".
      const facing = Math.cos(theta)
      if (facing > 0.6 && u.uFade.value > 0.9) {
        const ndc = this.scratch.clone().project(this.camera)
        const score = Math.hypot(ndc.x * this.camera.aspect, ndc.y * 1.4)
        if (!best || score < best.score) best = { design: card.design, score }
      }
    }

    // Far to near so the rounded corners blend over what's behind them.
    order.sort((a, b) => b.depth - a.depth)
    order.forEach(({ card }, index) => {
      card.mesh.renderOrder = index
    })

    const active = best && best.score < ACTIVE_RADIUS ? best.design : null
    if (active !== this.active) {
      this.active = active
      this.options.onActiveChange(active)
    }

    this.renderer.render(this.scene, this.camera)
  }
}

type Card = {
  mesh: THREE.Mesh
  material: THREE.ShaderMaterial
  design: number
}

// Geometry, in world units. The camera distance is solved per screen in resize().
const CARD_COUNT = 40
const CARD_W = 2.4
const CARD_H = 1.8
const CORNER = 0.06
const RADIUS = 4.4
// Angle and rise between neighbouring cards: about nine cards per turn.
const STEP = (Math.PI * 2) / 9.2
const PITCH = 0.36
const TILT_X = 0.12
// Sideways shift per unit of height, so the helix runs bottom left to top right.
const SHEAR_TALL = 0.7
const SHEAR_WIDE = 0.95
const FOV = 42
// Visible area at the front of the helix.
const VIEW_HEIGHT_TALL = 8.5
const VIEW_HEIGHT_WIDE = 8
const VIEW_WIDTH = 6.6

// Motion, in cards per second and cards per full section scroll.
const IDLE_SPEED = 0.32
const SCROLL_CARDS = 14
const EASE = 4.5
const PARALLAX = 0.45
// How close to the center (in NDC, roughly) the front card must be to show its name.
const ACTIVE_RADIUS = 0.42

const VERTEX = /* glsl */ `
  uniform float uTheta;
  uniform float uY;
  uniform float uRadius;
  uniform float uSlope;
  uniform float uShear;
  varying vec2 vUv;
  varying float vDepth;

  void main() {
    vUv = uv;
    // Wrap the flat card around the cylinder and lean it along the helix.
    float angle = uTheta + position.x / uRadius;
    vec3 p = vec3(uRadius * sin(angle), uY + position.y + position.x * uSlope, uRadius * cos(angle));
    // Shift by the card's height on the helix, not per vertex, so cards stay upright.
    p.x += uY * uShear;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`

const FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uAspect;
  uniform float uCorner;
  uniform float uFade;
  uniform float uFocus;
  uniform float uSpread;
  uniform float uVelocity;
  varying vec2 vUv;
  varying float vDepth;

  float roundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    vec2 uv = vUv;
    if (!gl_FrontFacing) uv.x = 1.0 - uv.x;

    // Depth of field: sharp at the front of the helix, soft toward the back.
    float far = clamp((vDepth - uFocus) / uSpread, 0.0, 1.0);
    float blur = clamp(far * 0.9 + uVelocity, 0.0, 1.0);
    vec3 color = texture2D(uMap, uv, blur * 4.5).rgb;

    color *= mix(1.0, 0.42, far);
    if (!gl_FrontFacing) color *= 0.32;

    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
    float d = roundedBox(p, vec2(uAspect * 0.5, 0.5), uCorner);
    float edge = fwidth(d);
    float mask = 1.0 - smoothstep(-edge, edge, d);

    gl_FragColor = vec4(color, mask * uFade);
    #include <colorspace_fragment>
  }
`
