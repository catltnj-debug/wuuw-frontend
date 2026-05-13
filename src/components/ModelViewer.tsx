"use client";

import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Html, useProgress } from "@react-three/drei";
import * as THREE from "three";

const T = "#00F5D4";

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="text-xs" style={{ color: T }}>{Math.round(progress)}%</div>
        <div className="w-24 h-0.5 rounded" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div
            className="h-full rounded transition-all"
            style={{ width: `${progress}%`, background: T }}
          />
        </div>
        <div className="text-xs" style={{ color: "#555" }}>加载模型中…</div>
      </div>
    </Html>
  );
}

function GLBModel({ url, autoRotate }: { url: string; autoRotate: boolean }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.4;
    }
  });

  // Center and normalize scale
  const box = new THREE.Box3().setFromObject(scene);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = maxDim > 0 ? 2 / maxDim : 1;

  return (
    <group ref={groupRef}>
      <primitive
        object={scene}
        scale={scale}
        position={[-center.x * scale, -center.y * scale, -center.z * scale]}
      />
    </group>
  );
}

interface ModelViewerProps {
  url: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = { sm: 240, md: 340, lg: 480 };

export default function ModelViewer({ url, size = "md" }: ModelViewerProps) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [hasError, setHasError] = useState(false);
  const height = SIZE_MAP[size];

  if (hasError) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-2xl text-center"
        style={{ height, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="text-2xl mb-2">⚠️</div>
        <p className="text-xs" style={{ color: "#555" }}>3D 预览加载失败</p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-xs mt-2 underline"
          style={{ color: T }}
        >
          直接下载文件
        </a>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        height,
        background: "rgba(8,8,14,0.95)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
      onPointerDown={() => setAutoRotate(false)}
    >
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        gl={{ antialias: true }}
        onError={() => setHasError(true)}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <directionalLight position={[-5, -3, -5]} intensity={0.4} />
        <Environment preset="city" />
        <Suspense fallback={<Loader />}>
          <GLBModel url={url} autoRotate={autoRotate} />
        </Suspense>
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          onStart={() => setAutoRotate(false)}
        />
      </Canvas>

      {/* hint */}
      <div
        className="absolute bottom-2 left-0 right-0 text-center text-xs pointer-events-none"
        style={{ color: "rgba(255,255,255,0.2)" }}
      >
        拖动旋转 · 滚轮缩放 · 右键平移
      </div>

      {/* auto-rotate toggle */}
      <button
        className="absolute top-2 right-2 text-xs px-2 py-1 rounded"
        style={{
          background: "rgba(0,0,0,0.5)",
          color: autoRotate ? T : "#666",
          border: `1px solid ${autoRotate ? "rgba(0,245,212,0.3)" : "rgba(255,255,255,0.08)"}`,
        }}
        onClick={() => setAutoRotate(v => !v)}
      >
        {autoRotate ? "⟳ 旋转中" : "⟳ 自动旋转"}
      </button>
    </div>
  );
}
