import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { useTranslation } from "react-i18next";
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

/**
 * Abstrakt bosh — kesish zonalarini ko‘rsatish uchun.
 * Foydalanuvchi selfiesini sharga yopishtirmaymiz (bu 360° emas, buzilgan texture).
 */
function ZoneHeadMesh({ activeZone }: { activeZone: MasterCardZoneKey | null }) {
  const skin = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#d8b49a", roughness: 0.72 }),
    [],
  );
  const hair = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#2a221c", roughness: 0.9 }),
    [],
  );
  const highlight = useMemo(() => {
    if (!activeZone) return null;
    return new THREE.MeshStandardMaterial({
      color: ZONE_COLOR[activeZone],
      transparent: true,
      opacity: 0.62,
      roughness: 0.35,
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
      <mesh material={skin}>
        <sphereGeometry args={[0.72, 32, 32]} />
      </mesh>
      <mesh material={hair} position={[0, 0.4, 0]} scale={[0.92, 0.52, 0.88]}>
        <sphereGeometry args={[0.55, 24, 24]} />
      </mesh>
      {activeZone === "sides" && highlight ? (
        <>
          <mesh material={highlight} position={[-0.62, 0.05, 0]}>
            <cylinderGeometry args={[0.16, 0.18, 0.7, 12]} />
          </mesh>
          <mesh material={highlight} position={[0.62, 0.05, 0]}>
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
  onLost,
}: {
  activeView: ExploreViewId;
  activeZone: MasterCardZoneKey | null;
  onLost: () => void;
}) {
  return (
    <>
      <ContextLostBridge onLost={onLost} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[3, 4, 2]} intensity={1} />
      <directionalLight position={[-2, 1, -2]} intensity={0.3} />
      <CameraRig view={activeView} />
      <ZoneHeadMesh activeZone={activeZone} />
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
  const { t } = useTranslation();
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
              <Scene activeView={activeView} activeZone={activeZone} onLost={fail} />
            </Suspense>
          </Canvas>
        </WebglErrorBoundary>
        <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-3 pb-3 pt-8 text-[11px] font-semibold text-white">
          {t("barberConsult.zoneViewerHint", {
            defaultValue: "Kesish zonasi — bu sizning 360° try-oningiz emas",
          })}
        </p>
      </div>
      <ViewPresets activeView={activeView} onViewChange={onViewChange} />
      <ZoneChips zones={zones} activeZone={activeZone} onZoneChange={onZoneChange} />
    </div>
  );
}
