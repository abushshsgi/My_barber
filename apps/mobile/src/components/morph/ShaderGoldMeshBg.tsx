import { LinearGradient } from "expo-linear-gradient";
import { createElement, useEffect, useRef } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

/** Shader palitra: qorong‘i / oltin / zaytun. */
const COL1 = "#0D0F0A";
const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
precision mediump float;
uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

void main() {
  vec2 st = gl_FragCoord.xy / uResolution.xy;
  vec3 col1 = vec3(0.05, 0.06, 0.04);
  vec3 col2 = vec3(0.72, 0.58, 0.23);
  vec3 col3 = vec3(0.22, 0.28, 0.18);
  float noise = sin(st.x * 3.0 + uTime * 0.5) * cos(st.y * 3.0 + uTime * 0.5);
  vec3 finalColor = mix(col1, mix(col2, col3, noise * 0.5 + 0.5), clamp(st.y + noise * 0.2, 0.0, 1.0));
  float grain = fract(sin(dot(st.xy + uTime * 0.02, vec2(12.9898, 78.233))) * 43758.5453) * 0.08;
  gl_FragColor = vec4(finalColor + grain, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function WebShaderMesh() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "uTime");
    const uRes = gl.getUniformLocation(prog, "uResolution");

    let raf = 0;
    let alive = true;
    const t0 = performance.now();

    const resize = () => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth || window.innerWidth;
      const h = parent?.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };

    resize();
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(resize)
        : null;
    if (canvas.parentElement && ro) ro.observe(canvas.parentElement);

    const frame = (now: number) => {
      if (!alive) return;
      gl.uniform1f(uTime, (now - t0) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);

  return createElement("canvas", {
    ref: canvasRef,
    "aria-hidden": true,
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      display: "block",
    },
  });
}

function MeshBlob({
  duration,
  dim,
  colors,
  rotateFrom,
  rotateTo,
  xFrom,
  xTo,
  yFrom,
  yTo,
  opacity,
}: {
  duration: number;
  dim: number;
  colors: readonly [string, string, string];
  rotateFrom: number;
  rotateTo: number;
  xFrom: number;
  xTo: number;
  yFrom: number;
  yTo: number;
  opacity: number;
}) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [duration, p]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(p.value, [0, 1], [xFrom, xTo]) },
      { translateY: interpolate(p.value, [0, 1], [yFrom, yTo]) },
      { rotate: `${interpolate(p.value, [0, 1], [rotateFrom, rotateTo])}deg` },
      { scale: interpolate(p.value, [0, 1], [1.04, 1.2]) },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: dim,
          height: dim,
          left: "50%",
          top: "50%",
          marginLeft: -dim / 2,
          marginTop: -dim / 2,
          opacity,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={[...colors]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={styles.fill}
      />
    </Animated.View>
  );
}

function NativeShaderMesh() {
  const { width, height } = useWindowDimensions();
  const dim = Math.max(width, height) * 1.95;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: COL1 }]} />
      <MeshBlob
        duration={12000}
        dim={dim}
        colors={["rgba(184,148,59,0.55)", "rgba(56,71,46,0.2)", "transparent"]}
        rotateFrom={-16}
        rotateTo={14}
        xFrom={-width * 0.16}
        xTo={width * 0.12}
        yFrom={-height * 0.12}
        yTo={height * 0.1}
        opacity={0.95}
      />
      <MeshBlob
        duration={17000}
        dim={dim * 0.92}
        colors={["rgba(56,71,46,0.5)", "rgba(13,15,10,0.15)", "transparent"]}
        rotateFrom={12}
        rotateTo={-18}
        xFrom={width * 0.14}
        xTo={-width * 0.1}
        yFrom={height * 0.08}
        yTo={-height * 0.1}
        opacity={0.9}
      />
      <MeshBlob
        duration={22000}
        dim={dim * 0.8}
        colors={["rgba(184,148,59,0.28)", "rgba(56,71,46,0.18)", "transparent"]}
        rotateFrom={-6}
        rotateTo={20}
        xFrom={-width * 0.05}
        xTo={width * 0.1}
        yFrom={height * 0.12}
        yTo={-height * 0.06}
        opacity={0.8}
      />
      <View style={[StyleSheet.absoluteFill, styles.grain]} />
    </View>
  );
}

/** Dark gold / metallic green — chat + parvarish umumiy shader fon. */
export function ShaderGoldMeshBg() {
  if (Platform.OS === "web") {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <WebShaderMesh />
      </View>
    );
  }
  return <NativeShaderMesh />;
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
  fill: { flex: 1, borderRadius: 999 },
  grain: {
    opacity: 0.14,
    backgroundColor: "rgba(184,148,59,0.06)",
  },
});
