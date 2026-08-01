import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  /** Try-on / front preview — bosh meshga texture sifatida. */
  previewImage?: string;
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

function canCreateWebgl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

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

function ContextLostBridge({ onLost }: { onLost: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    const handler = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    el.addEventListener("webglcontextlost", handler, false);
    return () => {
      el.removeEventListener("webglcontextlost", handler, false);
      try {
        gl.dispose();
      } catch {
        /* ignore */
      }
    };
  }, [gl, onLost]);
  return null;
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

function HeadMesh({
  activeZone,
  previewImage,
}: {
  activeZone: MasterCardZoneKey | null;
  previewImage?: string;
}) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!previewImage) {
      setTexture(null);
      return;
    }
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      previewImage,
      (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        setTexture(tex);
      },
      undefined,
      () => {
        if (!cancelled) setTexture(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [previewImage]);

  useEffect(() => {
    return () => {
      texture?.dispose();
    };
  }, [texture]);

  const skin = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: texture ? "#ffffff" : "#e8c4a8",
        map: texture ?? null,
        roughness: 0.7,
      }),
    [texture],
  );
  const hair = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#1f1a17", roughness: 0.85 }),
    [],
  );
  const highlight = useMemo(() => {
    if (!activeZone) return null;
    return new THREE.MeshStandardMaterial({
      color: ZONE_COLOR[activeZone],
      transparent: true,
      opacity: 0.55,
      roughness: 0.4,
    });
  }, [activeZone]);

  useEffect(() => {
    return () => {
      skin.dispose();
      hair.dispose();
      highlight?.dispose();
    };
  }, [skin, hair, highlight]);

  return (
    <group>
      <mesh material={skin} position={[0, 0, 0]}>
        <sphereGeometry args={[0.72, 32, 32]} />
      </mesh>
      {!texture ? (
        <mesh material={hair} position={[0, 0.42, 0]} scale={[0.95, 0.55, 0.9]}>
          <sphereGeometry args={[0.55, 24, 24]} />
        </mesh>
      ) : null}
      {activeZone === "sides" && highlight ? (
        <>
          <mesh material={highlight} position={[-0.62, 0.05, 0]} rotation={[0, 0, 0.2]}>
            <cylinderGeometry args={[0.16, 0.18, 0.7, 12]} />
          </mesh>
          <mesh material={highlight} position={[0.62, 0.05, 0]} rotation={[0, 0, -0.2]}>
            <cylinderGeometry args={[0.16, 0.18, 0.7, 12]} />
          </mesh>
          <mesh material={highlight} position={[0, -0.05, -0.55]}>
            <boxGeometry args={[0.7, 0.55, 0.2]} />
          </mesh>
        </>
      ) : null}
      {activeZone === "top" && highlight ? (
        <mesh material={highlight} position={[0, 0.55, 0.05]} scale={[0.85, 0.35, 0.8]}>
          <sphereGeometry args={[0.5, 20, 20]} />
        </mesh>
      ) : null}
      {activeZone === "beard" && highlight ? (
        <mesh material={highlight} position={[0, -0.35, 0.45]} scale={[0.7, 0.45, 0.35]}>
          <sphereGeometry args={[0.35, 20, 20]} />
        </mesh>
      ) : null}
    </group>
  );
}

function Scene({
  activeView,
  activeZone,
  previewImage,
  onLost,
}: {
  activeView: ExploreViewId;
  activeZone: MasterCardZoneKey | null;
  previewImage?: string;
  onLost: () => void;
}) {
  return (
    <>
      <ContextLostBridge onLost={onLost} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[3, 4, 2]} intensity={1} />
      <directionalLight position={[-2, 1, -2]} intensity={0.3} />
      <CameraRig view={activeView} />
      <HeadMesh activeZone={activeZone} previewImage={previewImage} />
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
  previewImage,
  onWebglError,
  className,
}: Props) {
  const [failed, setFailed] = useState(() => !canCreateWebgl());
  const reported = useRef(false);

  const fail = () => {
    if (reported.current) return;
    reported.current = true;
    setFailed(true);
    onWebglError?.();
  };

  useEffect(() => {
    if (failed) fail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failed]);

  if (failed) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-gradient-to-b from-neutral-200 to-neutral-100 ring-1 ring-border">
        <WebglErrorBoundary onError={fail}>
          <Canvas
            camera={{ position: VIEW_CAMERA.front, fov: 42 }}
            dpr={[1, 1.25]}
            gl={{
              antialias: false,
              powerPreference: "default",
              failIfMajorPerformanceCaveat: false,
              alpha: false,
            }}
            onCreated={({ gl }) => {
              gl.setClearColor("#f3f4f6");
            }}
          >
            <Suspense fallback={null}>
              <Scene
                activeView={activeView}
                activeZone={activeZone}
                previewImage={previewImage}
                onLost={fail}
              />
            </Suspense>
          </Canvas>
        </WebglErrorBoundary>
      </div>
      <ViewPresets activeView={activeView} onViewChange={onViewChange} />
      <ZoneChips zones={zones} activeZone={activeZone} onZoneChange={onZoneChange} />
    </div>
  );
}
