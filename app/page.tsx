'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

export default function Home() {
  const mountRef = useRef<HTMLDivElement>(null)
  const [speed, setSpeed] = useState(0.5)
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentPlanet, setCurrentPlanet] = useState(0)
  const [showTrajectory, setShowTrajectory] = useState(true)
  const [cameraMode, setCameraMode] = useState('free') // 'free', 'follow', 'top'
  const animationRef = useRef<number>()
  const controlsRef = useRef<OrbitControls>()
  const rendererRef = useRef<THREE.WebGLRenderer>()
  const tRef = useRef(0)
  const missileRef = useRef<THREE.Object3D>()
  const cameraRef = useRef<THREE.PerspectiveCamera>()
  const sceneRef = useRef<THREE.Scene>()

  useEffect(() => {
    if (!mountRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000510)
    scene.fog = new THREE.FogExp2(0x000510, 0.00075)
    sceneRef.current = scene

    // Define planets (formerly points)
    const planets = [
      { position: [0, 0, 0], size: 20, name: "Alpha", color: 0x3498db }, // Blue
      { position: [100, 0, 0], size: 15, name: "Beta", color: 0xe74c3c }, // Red
      { position: [100, 100, 0], size: 25, name: "Gamma", color: 0xf1c40f }, // Yellow
      { position: [0, 100, 0], size: 18, name: "Delta", color: 0x9b59b6 }, // Purple
      { position: [50, 50, 50], size: 30, name: "Epsilon", color: 0x2ecc71 }, // Green
      { position: [-100, 0, 0], size: 22, name: "Zeta", color: 0xe67e22 }, // Orange
      { position: [-100, -100, 0], size: 17, name: "Eta", color: 0x1abc9c }, // Teal
      { position: [0, -100, 0], size: 28, name: "Theta", color: 0xff5722 }, // Deep Orange
      { position: [200, 200, 200], size: 40, name: "Omega", color: 0xe91e63 }, // Pink
    ]
    const trajectory = [0, 1, 2, 3, 4, 5, 6, 7, 8, 0] // 0-based indexing

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      65, 
      mountRef.current.clientWidth / mountRef.current.clientHeight, 
      0.1, 
      3000
    )
    camera.position.set(300, 200, 500)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      logarithmicDepthBuffer: true
    })
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mountRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Controls setup
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.rotateSpeed = 0.8
    controls.zoomSpeed = 1.2
    controls.panSpeed = 0.8
    controls.minDistance = 50
    controls.maxDistance = 1000
    controlsRef.current = controls

    // Create starfield background
    const starGeometry = new THREE.BufferGeometry()
    const starVertices = []
    for (let i = 0; i < 10000; i++) {
      const x = (Math.random() - 0.5) * 2000
      const y = (Math.random() - 0.5) * 2000
      const z = (Math.random() - 0.5) * 2000
      starVertices.push(x, y, z)
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3))
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    })
    const stars = new THREE.Points(starGeometry, starMaterial)
    scene.add(stars)

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x111122, 0.2)
    scene.add(ambientLight)

    // Directional light (sun)
    const sunLight = new THREE.DirectionalLight(0xffffee, 1.5)
    sunLight.position.set(500, 300, 500)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 2048
    sunLight.shadow.mapSize.height = 2048
    sunLight.shadow.camera.near = 0.5
    sunLight.shadow.camera.far = 1500
    sunLight.shadow.camera.left = -500
    sunLight.shadow.camera.right = 500
    sunLight.shadow.camera.top = 500
    sunLight.shadow.camera.bottom = -500
    scene.add(sunLight)

    // Add a sun
    const sunGeometry = new THREE.SphereGeometry(60, 32, 32)
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff80,
      transparent: true,
      opacity: 0.9
    })
    const sun = new THREE.Mesh(sunGeometry, sunMaterial)
    sun.position.copy(sunLight.position)
    scene.add(sun)

    // Sun glow effect
    const sunGlowGeometry = new THREE.SphereGeometry(65, 32, 32)
    const sunGlowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0xffff80) },
        viewVector: { value: new THREE.Vector3() }
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(normalMatrix * viewVector);
          intensity = pow(0.7 - dot(vNormal, vNormel), 2.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
          vec3 glow = glowColor * intensity;
          gl_FragColor = vec4(glow, 1.0);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    })
    const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial)
    sunGlow.position.copy(sun.position)
    scene.add(sunGlow)

    // Create trajectory curve with improved interpolation
    const trajectoryPoints = []
    for (let i = 0; i < trajectory.length - 1; i++) {
      const p1 = new THREE.Vector3(...planets[trajectory[i]].position)
      const p2 = new THREE.Vector3(...planets[trajectory[i + 1]].position)
      
      // Add intermediate points for smoother curves
      for (let t = 0; t <= 1; t += 0.02) {
        trajectoryPoints.push(p1.clone().lerp(p2, t))
      }
    }

    // Trajectory visualization
    const trajectoryGeometry = new THREE.BufferGeometry().setFromPoints(trajectoryPoints)
    const trajectoryMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00ffff,
      transparent: true,
      opacity: 0.6,
      linewidth: 1
    })
    const trajectoryLine = new THREE.Line(trajectoryGeometry, trajectoryMaterial)
    trajectoryLine.visible = showTrajectory
    scene.add(trajectoryLine)

    // Create planets
    const planetObjects: THREE.Mesh[] = []
    const textureLoader = new THREE.TextureLoader()
    
    // Planetary ring geometry for decoration
    const ringGeometry = new THREE.RingGeometry(1.2, 1.8, 64)
    
    planets.forEach((planet, index) => {
      // Create planet sphere
      const planetGeometry = new THREE.SphereGeometry(planet.size, 32, 32)
      const planetMaterial = new THREE.MeshPhongMaterial({
        color: planet.color,
        shininess: 30,
        specular: 0x333333,
        emissive: new THREE.Color(planet.color).multiplyScalar(0.15)
      })
      
      const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial)
      planetMesh.position.set(...planet.position)
      planetMesh.castShadow = true
      planetMesh.receiveShadow = true
      
      // Create planet atmosphere
      const atmosphereGeometry = new THREE.SphereGeometry(planet.size * 1.1, 32, 32)
      const atmosphereMaterial = new THREE.MeshPhongMaterial({ 
        color: planet.color,
        transparent: true,
        opacity: 0.2,
        side: THREE.BackSide
      })
      const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial)
      planetMesh.add(atmosphere)
      
      // Add rings to some planets for visual interest
      if (index % 3 === 0) {
        const ringMaterial = new THREE.MeshPhongMaterial({
          color: 0xffffff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6
        })
        const ring = new THREE.Mesh(ringGeometry, ringMaterial)
        ring.scale.set(planet.size * 1.5, planet.size * 1.5, planet.size * 1.5)
        ring.rotation.x = Math.PI / 2
        planetMesh.add(ring)
      }
      
      // Create orbit circle around planets
      const orbitGeometry = new THREE.TorusGeometry(
        planet.size * 2, 
        0.5, 
        16, 
        100
      )
      const orbitMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(planet.color).multiplyScalar(0.5),
        transparent: true,
        opacity: 0.3
      })
      const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial)
      orbit.rotation.x = Math.PI / 2
      orbit.position.set(...planet.position)
      scene.add(orbit)
      
      // Create floating text label for planet name
      const planetGroup = new THREE.Group()
      planetGroup.add(planetMesh)
      planetGroup.position.set(...planet.position)
      scene.add(planetGroup)
      
      // Store planet for later reference
      planetObjects.push(planetMesh)
      scene.add(planetMesh)
    })

    // Create missile (formerly mover)
    const createMissile = () => {
      const missileGroup = new THREE.Group()
      
      // Missile body
      const bodyGeometry = new THREE.CylinderGeometry(0, 3, 20, 8)
      bodyGeometry.rotateX(Math.PI / 2)
      const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0xdddddd,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0x333333
      })
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
      body.castShadow = true
      
      // Missile fins
      const finGeometry = new THREE.BoxGeometry(1, 6, 6)
      const finMaterial = new THREE.MeshPhongMaterial({
        color: 0xff3333,
        shininess: 80
      })
      
      // Add four fins
      for (let i = 0; i < 4; i++) {
        const fin = new THREE.Mesh(finGeometry, finMaterial)
        fin.position.set(0, -10, 0)
        fin.rotation.z = (Math.PI / 2) * i
        body.add(fin)
      }
      
      // Engine exhaust
      const exhaustGeometry = new THREE.ConeGeometry(2, 10, 8)
      exhaustGeometry.rotateX(-Math.PI / 2)
      const exhaustMaterial = new THREE.MeshBasicMaterial({
        color: 0xff8800,
        transparent: true,
        opacity: 0.8
      })
      const exhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial)
      exhaust.position.set(0, 12, 0)
      body.add(exhaust)
      
      // Add point light for engine glow
      const engineLight = new THREE.PointLight(0xff6600, 2, 20)
      engineLight.position.set(0, 15, 0)
      body.add(engineLight)
      
      missileGroup.add(body)
      return missileGroup
    }
    
    const missile = createMissile()
    missile.scale.set(0.8, 0.8, 0.8)
    scene.add(missile)
    missileRef.current = missile

    // Add missile trail
    const trailMaxPoints = 150
    const trailPositions = new Float32Array(trailMaxPoints * 3)
    const trailColors = new Float32Array(trailMaxPoints * 3)
    
    const trailGeometry = new THREE.BufferGeometry()
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3))
    trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3))
    
    const trailMaterial = new THREE.LineBasicMaterial({ 
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      linewidth: 2
    })
    
    const trail = new THREE.Line(trailGeometry, trailMaterial)
    scene.add(trail)
    
    let trailPointsCount = 0

    // Animation function
    const animate = () => {
      const segment = Math.floor(tRef.current)
      const nextSegment = (segment + 1) % trajectory.length
      const localT = tRef.current - segment
      
      // Get current and next planet positions
      const p1 = new THREE.Vector3(...planets[trajectory[segment]].position)
      const p2 = new THREE.Vector3(...planets[trajectory[nextSegment]].position)
      
      // Calculate missile position
      const current = p1.clone().lerp(p2, localT)
      
      if (missile && isPlaying) {
        // Update missile position
        missile.position.set(current.x, current.y, current.z)
        
        // Make missile point in direction of travel
        if (segment !== nextSegment) {
          const direction = p2.clone().sub(p1).normalize()
          missile.lookAt(p2)
          
          // Add some oscillation for more dynamic movement
          missile.rotation.z = Math.sin(tRef.current * 10) * 0.1
        }
        
        // Update current planet indicator
        setCurrentPlanet(trajectory[segment])
        
        // Update trail with color gradient
        if (trailPointsCount < trailMaxPoints) {
          trailPositions[trailPointsCount * 3] = current.x
          trailPositions[trailPointsCount * 3 + 1] = current.y
          trailPositions[trailPointsCount * 3 + 2] = current.z
          
          // Color gradient from red to blue
          const colorT = trailPointsCount / trailMaxPoints
          trailColors[trailPointsCount * 3] = 1 - colorT // Red decreases
          trailColors[trailPointsCount * 3 + 1] = 0.2 // Green constant
          trailColors[trailPointsCount * 3 + 2] = colorT // Blue increases
          
          trailPointsCount++
        } else {
          // Shift trail points
          for (let i = 0; i < trailMaxPoints - 1; i++) {
            trailPositions[i * 3] = trailPositions[(i + 1) * 3]
            trailPositions[i * 3 + 1] = trailPositions[(i + 1) * 3 + 1]
            trailPositions[i * 3 + 2] = trailPositions[(i + 1) * 3 + 2]
            
            trailColors[i * 3] = trailColors[(i + 1) * 3]
            trailColors[i * 3 + 1] = trailColors[(i + 1) * 3 + 1]
            trailColors[i * 3 + 2] = trailColors[(i + 1) * 3 + 2]
          }
          
          // Add new position
          trailPositions[(trailMaxPoints - 1) * 3] = current.x
          trailPositions[(trailMaxPoints - 1) * 3 + 1] = current.y
          trailPositions[(trailMaxPoints - 1) * 3 + 2] = current.z
          
          // New color (blue)
          trailColors[(trailMaxPoints - 1) * 3] = 0.2
          trailColors[(trailMaxPoints - 1) * 3 + 1] = 0.2
          trailColors[(trailMaxPoints - 1) * 3 + 2] = 1.0
        }
        
        trail.geometry.attributes.position.needsUpdate = true
        trail.geometry.attributes.color.needsUpdate = true
        
        // Update animation time
        if (isPlaying) {
          tRef.current += speed * 0.01
          if (tRef.current >= trajectory.length - 1) tRef.current = 0
        }
      }
      
      // Camera modes
      if (cameraMode === 'follow' && missile) {
        // Position camera behind missile
        const offset = new THREE.Vector3(0, 50, 150)
        const missileDirection = new THREE.Vector3()
        missile.getWorldDirection(missileDirection)
        missileDirection.negate()
        
        const targetPosition = missile.position.clone().add(
          offset.clone().applyQuaternion(missile.quaternion)
        )
        
        camera.position.lerp(targetPosition, 0.05)
        camera.lookAt(missile.position)
        
        // Disable controls in follow mode
        controls.enabled = false
      } else if (cameraMode === 'top') {
        // Top-down strategic view
        const targetPosition = new THREE.Vector3(0, 400, 0)
        camera.position.lerp(targetPosition, 0.05)
        camera.lookAt(new THREE.Vector3(0, 0, 0))
        controls.enabled = false
      } else {
        // Free mode - controls enabled
        controls.enabled = true
      }
      
      // Update sun glow to always face camera
      if (sunGlowMaterial.uniforms) {
        sunGlowMaterial.uniforms.viewVector.value = 
          new THREE.Vector3().subVectors(camera.position, sun.position)
      }
      
      // Rotate planets slowly for visual effect
      planetObjects.forEach((planet, index) => {
        planet.rotation.y += 0.001 * (index % 3 + 1)
      })
      
      controls.update()
      renderer.render(scene, camera)
      animationRef.current = requestAnimationFrame(animate)
    }

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    }

    window.addEventListener('resize', handleResize)
    
    // Start animation
    animationRef.current = requestAnimationFrame(animate)

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement)
      }
      controls.dispose()
    }
  }, [cameraMode, showTrajectory])

  // Toggle trajectory visibility
  const toggleTrajectory = () => {
    setShowTrajectory(prev => !prev)
    if (sceneRef.current) {
      sceneRef.current.children.forEach((child: { visible: boolean }) => {
        if (child instanceof THREE.Line && !(child instanceof THREE.LineSegments)) {
          child.visible = !showTrajectory
        }
      })
    }
  }

  // Switch camera mode
  const changeCameraMode = (mode: string) => {
    setCameraMode(mode)
  }

  return (
    <div className="h-screen w-full bg-black relative overflow-hidden">
      <div className="relative h-full w-full" ref={mountRef}></div>
      
      {/* Main control panel */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 p-4 rounded-lg bg-gray-900/80 text-white shadow-lg backdrop-blur-md border border-cyan-500/20 max-w-4xl w-11/12 md:w-auto">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Controls section */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsPlaying(!isPlaying)} 
              className="px-4 py-2 rounded-lg font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition flex items-center gap-2"
            >
              {isPlaying ? (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/>
                    <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>
                  </svg>
                  Pause
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 4L18 12L6 20V4Z" fill="currentColor"/>
                  </svg>
                  Play
                </>
              )}
            </button>
            
            <button 
              onClick={() => {tRef.current = 0}} 
              className="px-4 py-2 rounded-lg font-medium bg-gray-700 hover:bg-gray-600 text-white transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4.01 7.58 4.01 12C4.01 16.42 7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z" fill="currentColor"/>
              </svg>
              Reset
            </button>
            
            <button 
              onClick={toggleTrajectory} 
              className={`px-4 py-2 rounded-lg font-medium ${showTrajectory ? 'bg-cyan-700' : 'bg-gray-700'} hover:bg-opacity-80 text-white transition flex items-center gap-2`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 9L12 16L5 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {showTrajectory ? 'Hide Path' : 'Show Path'}
            </button>
          </div>
          
          {/* Speed control */}
          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">Speed:</span>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-24 accent-cyan-500"
            />
            <span className="w-12 text-center text-sm">{speed.toFixed(1)}x</span>
          </div>
          
          {/* Camera modes */}
          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">Camera:</span>
            <div className="flex rounded-lg overflow-hidden">
              <button 
                onClick={() => changeCameraMode('free')} 
                className={`px-3 py-1 text-sm ${cameraMode === 'free' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-200'}`}
              >
                Free
              </button>
              <button 
                onClick={() => changeCameraMode('follow')} 
                className={`px-3 py-1 text-sm ${cameraMode === 'follow' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-200'}`}
              >
                Follow
              </button>
              <button 
                onClick={() => changeCameraMode('top')} 
                className={`px-3 py-1 text-sm ${cameraMode === 'top' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-200'}`}
              >
                Top
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mission info panel */}
      <div className="absolute top-4 left-4 p-4 rounded-lg bg-gray-900/80 text-white shadow-lg backdrop-blur-md border border-cyan-500/20 w-64">
        <h2 className="font-bold text-lg mb-1 text-cyan-400 flex items-center gap-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L19.8 7V17L12 22L4.2 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 22V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M19.8 7L12 12L4.2 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Mission Control
        </h2>
        <div className="space-y-2 mt-3">
          <div className="bg-gray-800/60 p-2 rounded-md">
            <div className="text-xs text-gray-400">Current Planet</div>
            <div className="text-lg font-mono text-cyan-300">{["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Omega"][currentPlanet]}</div>
          </div>
          
          <div className="bg-gray-800/60 p-2 rounded-md">
            <div className="text-xs text-gray-400">Mission Status</div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <div className="text-sm">{isPlaying ? 'Active' : 'Paused'}</div>
            </div>
          </div>
          
          <div className="bg-gray-800/60 p-2 rounded-md">
            <div className="text-xs text-gray-400">Navigation</div>
            <div className="text-sm">Use mouse to rotate view</div>
            <div className="text-sm">Scroll to zoom in/out</div>
          </div>
        </div>
      </div>
      
      {/* Planet information - appears when hovering near current planet */}
      <div className="absolute top-4 right-4 p-4 rounded-lg bg-gray-900/80 text-white shadow-lg backdrop-blur-md border border-cyan-500/20 w-64">
        <h2 className="font-bold text-lg mb-1 text-cyan-400 flex items-center gap-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="8" r="2" fill="currentColor"/>
            <path d="M12 10V16" stroke="currentColor" strokeWidth="2"/>
          </svg>
          Planet Info
        </h2>
        <div className="space-y-2 mt-3">
          <div className="bg-gray-800/60 p-2 rounded-md">
            <div className="text-xs text-gray-400">Name</div>
            <div className="text-lg font-mono text-cyan-300">{["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Omega"][currentPlanet]}</div>
          </div>
          
          <div className="bg-gray-800/60 p-2 rounded-md">
            <div className="text-xs text-gray-400">Class</div>
            <div className="text-sm">{["M-Class", "Desert", "Gas Giant", "Ocean", "Terrestrial", "Rocky", "Ice", "Volcanic", "Supergiant"][currentPlanet]}</div>
          </div>
          
          <div className="bg-gray-800/60 p-2 rounded-md">
            <div className="text-xs text-gray-400">Status</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <div className="text-sm">Clear for approach</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Missile stats panel */}
      <div className="absolute bottom-24 right-4 p-4 rounded-lg bg-gray-900/80 text-white shadow-lg backdrop-blur-md border border-red-500/20 w-64">
        <h2 className="font-bold text-lg mb-1 text-red-400 flex items-center gap-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 2L13.8 10.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 6.2L16 3.2M17.8 11L20.8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10.2 13.8L3 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10.2 13.8L7.8 11.4C6.7 10.3 6.1 8.8 6.1 7.3C6.1 5.8 6.7 4.3 7.8 3.2L10.2 5.6L12.6 8L10.2 13.8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Missile Telemetry
        </h2>
        <div className="space-y-2 mt-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800/60 p-2 rounded-md">
              <div className="text-xs text-gray-400">Velocity</div>
              <div className="text-sm font-mono">{Math.round(300 * speed)} km/s</div>
            </div>
            
            <div className="bg-gray-800/60 p-2 rounded-md">
              <div className="text-xs text-gray-400">Distance</div>
              <div className="text-sm font-mono">{Math.round(150 * tRef.current)} AU</div>
            </div>
          </div>
          
          <div className="bg-gray-800/60 p-2 rounded-md">
            <div className="text-xs text-gray-400">Engine Output</div>
            <div className="w-full bg-gray-700 h-2 rounded-full mt-1">
              <div 
                className="bg-gradient-to-r from-orange-500 to-red-500 h-full rounded-full"
                style={{ width: `${isPlaying ? 80 + Math.sin(Date.now() / 200) * 15 : 0}%` }}
              ></div>
            </div>
          </div>
          
          <div className="bg-gray-800/60 p-2 rounded-md">
            <div className="text-xs text-gray-400">Fuel Reserves</div>
            <div className="w-full bg-gray-700 h-2 rounded-full mt-1">
              <div 
                className="bg-cyan-500 h-full rounded-full transition-all duration-1000"
                style={{ width: `${Math.max(0, 100 - (tRef.current * 5))}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Trajectory Progress Bar */}
      <div className="absolute bottom-4 left-4 w-48 p-3 rounded-lg bg-gray-900/80 text-white shadow-lg backdrop-blur-md border border-cyan-500/20">
        <h3 className="text-xs text-gray-300 mb-1">Mission Progress</h3>
        <div className="w-full bg-gray-800 h-2 rounded-full">
          <div 
            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full transition-all"
            style={{ width: `${(tRef.current / 9) * 100}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs mt-1 text-gray-400">
          <span>Alpha</span>
          <span>Omega</span>
        </div>
      </div>
      
      {/* Mini map */}
      <div className="absolute top-4 right-1/2 transform translate-x-1/2 p-3 rounded-lg bg-gray-900/80 text-white shadow-lg backdrop-blur-md border border-cyan-500/20 flex items-center gap-4">
        <div>
          <div className="text-xs text-gray-400 mb-1">System Map</div>
          <div className="w-48 h-32 bg-gray-800 rounded-md relative overflow-hidden">
            {/* Minimap planets */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="absolute left-[75%] top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-red-500 rounded-full"></div>
            <div className="absolute left-[75%] top-[75%] transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-500 rounded-full"></div>
            <div className="absolute left-1/2 top-[75%] transform -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
            <div className="absolute left-[62%] top-[62%] transform -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-green-500 rounded-full"></div>
            <div className="absolute left-[25%] top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-orange-500 rounded-full"></div>
            <div className="absolute left-[25%] top-[25%] transform -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-teal-500 rounded-full"></div>
            <div className="absolute left-1/2 top-[25%] transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-orange-600 rounded-full"></div>
            <div className="absolute left-[90%] top-[90%] transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-pink-500 rounded-full"></div>
            
            {/* Current position indicator */}
            <div 
              className="absolute w-2 h-2 bg-white border border-white rounded-full animate-ping"
              style={{ 
                left: `${tRef.current * 10}%`, 
                top: `${50 + Math.sin(tRef.current * Math.PI) * 25}%`,
                display: isPlaying ? 'block' : 'none'
              }}
            ></div>
            
            {/* Trajectory line */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path 
                d="M50,50 L75,50 L75,75 L50,75 L62,62 L25,50 L25,25 L50,25 L90,90 z" 
                stroke="rgba(0, 255, 255, 0.5)" 
                fill="none" 
                strokeWidth="1"
                strokeDasharray={showTrajectory ? "none" : "2,2"}
              />
            </svg>
          </div>
        </div>
        
        <div className="flex flex-col gap-1">
          <div className="text-xs text-gray-400">Active Sectors</div>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
              <span>Alpha</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              <span>Beta</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
              <span>Gamma</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
              <span>Delta</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Application title */}
      <div className="absolute top-20 left-4 text-white/20 text-xl font-bold tracking-wider">
        INTERSTELLAR MISSILE SIMULATOR v2.5
      </div>
      
      {/* Notifications - appear dynamically */}
      {isPlaying && Math.floor(tRef.current) !== Math.floor(tRef.current - speed * 0.01) && (
        <div className="absolute top-40 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-cyan-600/40 border border-cyan-500 text-white rounded-lg backdrop-blur-md animate-fade-in-out text-center">
          <div className="text-sm font-bold">Approaching {["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Omega"][Math.floor(tRef.current + 1) % 9]} Planet</div>
          <div className="text-xs">Adjust trajectory as needed</div>
        </div>
      )}
      
      {/* Modal dialog - for settings and help */}
      {false && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-cyan-500/30 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl text-cyan-400 font-bold mb-4">Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-white block mb-2">Visual Quality</label>
                <select className="w-full bg-gray-800 text-white px-3 py-2 rounded-md border border-gray-700">
                  <option>Ultra</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
              
              <div>
                <label className="text-white block mb-2">Sound Effects</label>
                <div className="flex items-center">
                  <input type="checkbox" className="w-4 h-4 accent-cyan-500 mr-2" />
                  <span className="text-white">Enabled</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6 gap-3">
              <button className="px-4 py-2 bg-gray-700 text-white rounded-md">Cancel</button>
              <button className="px-4 py-2 bg-cyan-600 text-white rounded-md">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Help tooltip */}
      <div className="absolute bottom-24 left-4 text-white text-xs bg-gray-900/60 backdrop-blur-sm px-3 py-1 rounded-full opacity-70 flex items-center gap-1">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 17H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Press `F` to toggle fullscreen
      </div>
      
      {/* Loading overlay - for initial loading animation */}
      {false && (
        <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-cyan-400 text-xl font-bold">Initializing Simulation</div>
          <div className="w-64 h-1 bg-gray-800 rounded-full mt-4">
            <div className="h-full bg-cyan-500 rounded-full w-3/4"></div>
          </div>
        </div>
      )}
    </div>
  )
}