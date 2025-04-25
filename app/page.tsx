'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

export default function Home() {
  const mountRef = useRef<HTMLDivElement>(null)
  const [speed, setSpeed] = useState(0.5)
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentPoint, setCurrentPoint] = useState(0)
  const [theme, setTheme] = useState('dark')
  const animationRef = useRef<number>()
  const rendererRef = useRef<THREE.WebGLRenderer>()
  const tRef = useRef(0)

  useEffect(() => {
    if (!mountRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(theme === 'dark' ? 0x0a0a0a : 0xf0f0f0)
    scene.fog = new THREE.Fog(theme === 'dark' ? 0x0a0a0a : 0xf0f0f0, 200, 1000)

    // Define points for the path
    const points = [
      [0, 0, 0],
      [100, 0, 0],
      [100, 100, 0],
      [0, 100, 0],
      [50, 50, 50],
      [-100, 0, 0],
      [-100, -100, 0],
      [0, -100, 0],
      [200, 200, 200],
    ]
    const path = [0, 1, 2, 3, 4, 5, 6, 7, 8, 0] // 0-based indexing

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      65, 
      mountRef.current.clientWidth / mountRef.current.clientHeight, 
      0.1, 
      2000
    )
    camera.position.set(200, 200, 400)
    camera.lookAt(0, 0, 0)

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setPixelRatio(window.devicePixelRatio)
    mountRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Controls setup
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05

    // Grid helper
    const gridHelper = new THREE.GridHelper(
      500, 
      50, 
      theme === 'dark' ? 0x333333 : 0xcccccc, 
      theme === 'dark' ? 0x222222 : 0xdddddd
    )
    scene.add(gridHelper)

    // Axes Helper
    const axesHelper = new THREE.AxesHelper(100)
    scene.add(axesHelper)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(200, 300, 100)
    directionalLight.castShadow = true
    directionalLight.shadow.camera.near = 0.1
    directionalLight.shadow.camera.far = 500
    directionalLight.shadow.camera.left = -200
    directionalLight.shadow.camera.right = 200
    directionalLight.shadow.camera.top = 200
    directionalLight.shadow.camera.bottom = -200
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    scene.add(directionalLight)

    // Create path with curved segments
    const pathPoints = []
    for (let i = 0; i < path.length - 1; i++) {
      const p1 = new THREE.Vector3(...points[path[i]])
      const p2 = new THREE.Vector3(...points[path[i + 1]])
      
      // Add intermediate points for smoother curves
      for (let t = 0; t <= 1; t += 0.05) {
        pathPoints.push(p1.clone().lerp(p2, t))
      }
    }

    // Path visualization
    const pathGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints)
    const pathMaterial = new THREE.LineBasicMaterial({ 
      color: theme === 'dark' ? 0x3498db : 0x2980b9,
      linewidth: 2
    })
    const pathLine = new THREE.Line(pathGeometry, pathMaterial)
    scene.add(pathLine)

    // Create platform for points
    const platformGeometry = new THREE.CylinderGeometry(10, 10, 2, 32)
    const platformMaterial = new THREE.MeshPhongMaterial({ 
      color: theme === 'dark' ? 0x222222 : 0xdddddd,
      shininess: 100
    })

    // Visualize path points with spheres and platforms
    const pointObjects = []
    points.forEach(([x, y, z], index) => {
      // Platform
      const platform = new THREE.Mesh(platformGeometry, platformMaterial)
      platform.position.set(x, y - 8, z)
      platform.receiveShadow = true
      scene.add(platform)

      // Point marker
      const markerGeometry = new THREE.SphereGeometry(5)
      const markerMaterial = new THREE.MeshPhongMaterial({ 
        color: index === 0 ? 0xff3333 : 0xff9500,
        emissive: index === 0 ? 0x440000 : 0x331000,
        shininess: 50
      })
      const marker = new THREE.Mesh(markerGeometry, markerMaterial)
      marker.position.set(x, y, z)
      marker.castShadow = true
      marker.receiveShadow = true
      scene.add(marker)
      
      // Point number label
      pointObjects.push({ position: new THREE.Vector3(x, y, z), index })
    })

    // Moving object
    const moverGeometry = new THREE.SphereGeometry(8)
    const moverMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x2ecc71,
      emissive: 0x0a3a1c,
      shininess: 80
    })
    const mover = new THREE.Mesh(moverGeometry, moverMaterial)
    mover.castShadow = true
    scene.add(mover)

    // Add trail effect
    const trailMaxPoints = 100
    const trailPositions = new Float32Array(trailMaxPoints * 3)
    const trailGeometry = new THREE.BufferGeometry()
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3))
    
    const trailMaterial = new THREE.LineBasicMaterial({ 
      color: 0x2ecc71,
      transparent: true,
      opacity: 0.7
    })
    
    const trail = new THREE.Line(trailGeometry, trailMaterial)
    scene.add(trail)
    
    let trailPointsCount = 0

    // Animation function
    const animate = () => {
      if (isPlaying) {
        const segment = Math.floor(tRef.current)
        const nextSegment = (segment + 1) % path.length
        const localT = tRef.current - segment
        
        const p1 = new THREE.Vector3(...points[path[segment]])
        const p2 = new THREE.Vector3(...points[path[nextSegment]])
        const current = p1.clone().lerp(p2, localT)
        
        mover.position.set(current.x, current.y, current.z)
        
        // Update current point indicator
        setCurrentPoint(path[segment])
        
        // Update trail
        if (trailPointsCount < trailMaxPoints) {
          trailPositions[trailPointsCount * 3] = current.x
          trailPositions[trailPointsCount * 3 + 1] = current.y
          trailPositions[trailPointsCount * 3 + 2] = current.z
          trailPointsCount++
        } else {
          // Shift trail points
          for (let i = 0; i < trailMaxPoints - 1; i++) {
            trailPositions[i * 3] = trailPositions[(i + 1) * 3]
            trailPositions[i * 3 + 1] = trailPositions[(i + 1) * 3 + 1]
            trailPositions[i * 3 + 2] = trailPositions[(i + 1) * 3 + 2]
          }
          // Add new position
          trailPositions[(trailMaxPoints - 1) * 3] = current.x
          trailPositions[(trailMaxPoints - 1) * 3 + 1] = current.y
          trailPositions[(trailMaxPoints - 1) * 3 + 2] = current.z
        }
        
        trail.geometry.attributes.position.needsUpdate = true
        
        // Update animation time
        tRef.current += speed * 0.01
        if (tRef.current >= path.length - 1) tRef.current = 0
      }
      
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
  }, [theme])

  // Toggle theme function
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className={`h-screen w-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <div className="relative h-full w-full" ref={mountRef}></div>
      
      {/* Control panel */}
      <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} shadow-lg flex flex-col md:flex-row gap-4 items-center`}>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsPlaying(!isPlaying)} 
            className={`px-4 py-2 rounded-lg font-medium ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          
          <button 
            onClick={() => {tRef.current = 0}} 
            className={`px-4 py-2 rounded-lg font-medium ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Reset
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <span>Speed:</span>
          <input
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-24"
          />
          <span>{speed.toFixed(1)}x</span>
        </div>
        
        <div className="text-sm">
          Current Point: <span className="font-bold">{currentPoint}</span>
        </div>
        
        <button 
          onClick={toggleTheme} 
          className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
        >
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>

      {/* Info overlay */}
      <div className={`absolute top-4 left-4 p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-800/80 text-white' : 'bg-white/80 text-gray-800'} shadow-lg max-w-xs`}>
        <h2 className="font-bold text-lg mb-1">3D Path Animation</h2>
        <p className="text-sm">Use mouse to rotate, scroll to zoom, and right-click to pan.</p>
      </div>
    </div>
  )
}