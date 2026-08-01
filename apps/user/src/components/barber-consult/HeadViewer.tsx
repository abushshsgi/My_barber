import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import * as THREE from "three";
import { ViewPresets } from "@/components/barber-consult/ViewPresets";
import { ZoneChips } from "@/components/barber-consult/ZoneChips";
import type { ExploreViewId } from "@/lib/explore-views";
import type { MasterCardZoneKey, MasterCardZones } from "@/types/barber-master-card";
import { cn } from "@/lib/utils";

type Props = {
  activeView: ExploreViewId;
  onViewChange: (view: ExploreViewId) => void;
  zones: MasterCardZones;
  activeZone: MasterCardZoneKey | null;
  onZoneChange: (zone: MasterCardZoneKey | null) => void;
  onWebglError?: () => void;
  className?: string;
};

const VIEW_CAMERA: Record<ExploreViewId, [number, number, number]> = {
  front: [0, 0.15, 2.6],
  left: [-2.4, 0.2, 0.4],
  right: [2.4, 0.2, 0.4],
  back: [0, 0.2, -2.6],
};

const ZONE_COLOR: Record<MasterCardZoneKey, string> = {
  sides: "#38bdf8",
  top: "#f59e0b",
  beard: "#10b981",
};

class WebglErrorBoundary extends Component<
  { onError?: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function CameraRig({ view }: { view: ExploreViewId }) {
  const { camera } = useThree();
  useEffect(() => {
    const [x, y, z] = VIEW_CAMERA[view];
    camera.position.set(x, y, z);
    camera.lookAt(0, 0.1, 0);
  }, [camera, view]);
  return null;
}

function HeadMesh({ activeZone }: { activeZone: MasterCardZoneKey | null }) {
  const skin = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e8c4a8", roughness: 0.65 }), []);
  const hair = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1f1a17", roughness: 0.85 }), []);
  const highlight = useMemo(() => {
    if (!activeZone) return null;
    return new THREE.MeshStandardMaterial({
      color: ZONE_COLOR[activeZone],
      transparent: true,
      opacity: 0.55,
      roughness: 0.4,
    });
  }, [activeZone]);

  return (
    <group>
      <mesh material={skin} position={[0, 0, 0]} castShadow>
        <sphereGeometry args={[0.72, 48, 48]} />
      </mesh>
      <mesh material={hair} position={[0, 0.42, 0]} scale={[0.95, 0.55, 0.9]}>
        <sphereGeometry args={[0.55, 32, 32]} />
      </mesh>
      {activeZone === "sides" && highlight ? (
        <>
          <mesh material={highlight} position={[-0.62, 0.05, 0]} rotation={[0, 0, 0.2]}>
            <cylinderGeometry args={[0.16, 0.18, 0.7, 16]} />
          </mesh>
          <mesh material={highlight} position={[0.62, 0.05, 0]} rotation={[0, 0, -0.2]}>
            <cylinderGeometry args={[0.16, 0.18, 0.7, 16]} />
          </mesh>
          <mesh material={highlight} position={[0, -0.05, -0.55]}>
            <boxGeometry args={[0.7, 0.55, 0.2]} />
          </mesh>
        </>
      ) : null}
      {activeZone === "top" && highlight ? (
        <mesh material={highlight} position={[0, 0.55, 0.05]} scale={[0.85, 0.35, 0.8]}>
          <sphereGeometry args={[0.5, 24, 24]} />
        </mesh>
      ) : null}
      {activeZone === "beard" && highlight ? (
        <mesh material={highlight} position={[0, -0.35, 0.45]} scale={[0.7, 0.45, 0.35]}>
          <sphereGeometry args={[0.35, 24, 24]} />
        </mesh>
      ) : null}
    </group>
  );
}

function Scene({
  activeView,
  activeZone,
}: {
  activeView: ExploreViewId;
  activeZone: MasterCardZoneKey | null;
}) {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 2]} intensity={1.1} />
      <directionalLight position={[-2, 1, -2]} intensity={0.35} />
      <CameraRig view={activeView} />
      <HeadMesh activeZone={activeZone} />
      <OrbitControls enablePan={false} minDistance={1.8} maxDistance={4} target={[0, 0.1, 0]} />
    </>
  );
}

export function HeadViewer({
  activeView,
  onViewChange,
  zones,
  activeZone,
  onZoneChange,
  onWebglError,
  className,
}: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-gradient-to-b from-neutral-200 to-neutral-100 ring-1 ring-border">
        <WebglErrorBoundary
          onError={() => {
            setFailed(true);
            onWebglError?.();
          }}
        >
          <Canvas
            camera={{ position: VIEW_CAMERA.front, fov: 42 }}
            dpr={[1, 1.5]}
            onCreated={({ gl }) => {
              gl.setClearColor("#f3f4f6");
            }}
          >
            <Suspense fallback={null}>
              <Scene activeView={activeView} activeZone={activeZone} />
            </Suspense>
          </Canvas>
        </WebglErrorBoundary>
      </div>
      <ViewPresets activeView={activeView} onViewChange={onViewChange} />
      <ZoneChips zones={zones} activeZone={activeZone} onZoneChange={onZoneChange} />
    </div>
  );
}
