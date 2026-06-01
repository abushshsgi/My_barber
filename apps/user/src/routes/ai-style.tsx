import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Sparkles, Camera, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/ai-style")({
  head: () => ({
    meta: [
      { title: "AI Stil maslahatchi — mysaloon.uz" },
      {
        name: "description",
        content: "Selfie yuklang — AI yuz shakliga mos turmag va ranglarni tavsiya qiladi.",
      },
    ],
  }),
  component: AiStylePage,
});

interface Suggestion {
  id: string;
  title: string;
  desc: string;
  match: number;
  hue: number;
}

const SUGGESTIONS: Suggestion[] = [
  {
    id: "s1",
    title: "Textured Crop",
    desc: "Yuz shakli ovalsiz — qisqa, yengil tepada",
    match: 94,
    hue: 240,
  },
  { id: "s2", title: "Mid Fade + Quiff", desc: "Klassik kontur, hajmli tepa", match: 88, hue: 18 },
  {
    id: "s3",
    title: "Soft Layered Bob",
    desc: "Yumshoq qatlamlar, yuzga ramka",
    match: 82,
    hue: 320,
  },
];

function AiStylePage() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (f: File | null | undefined) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result as string);
      setDone(false);
    };
    reader.readAsDataURL(f);
  };

  const analyze = () => {
    setAnalyzing(true);
    setDone(false);
    setTimeout(() => {
      setAnalyzing(false);
      setDone(true);
    }, 1800);
  };

  const reset = () => {
    setPhoto(null);
    setDone(false);
  };

  return (
    <div className="pb-24">
      <PageHeader
        title="AI Stil maslahatchi"
        subtitle="Selfie yuklang — moslashgan turmag taklif qilamiz"
      />

      <section className="px-5">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="user"
          hidden
          onChange={(e) => onFile(e.target.files?.[0])}
        />

        {!photo ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border bg-surface active:scale-[0.99]"
          >
            <div className="grid h-16 w-16 place-items-center rounded-full bg-foreground text-background">
              <Camera className="h-7 w-7" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold">Selfie yuklang</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                JPG / PNG · yuz aniq ko'rinsin
              </p>
            </div>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-background px-3 py-1.5 text-[11px] font-bold">
              <Upload className="h-3 w-3" /> Faylni tanlash
            </span>
          </button>
        ) : (
          <div className="relative overflow-hidden rounded-3xl">
            <img src={photo} alt="selfie" className="aspect-[4/5] w-full object-cover" />
            {analyzing && (
              <motion.div
                className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-white to-transparent"
                animate={{ y: [0, 400, 0] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
            )}
            <button
              onClick={reset}
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        )}

        {photo && !done && (
          <button
            onClick={analyze}
            disabled={analyzing}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-5 py-4 text-sm font-bold text-background active:scale-[0.98] disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            {analyzing ? "Tahlil qilinmoqda…" : "AI tavsiyasini olish"}
          </button>
        )}
      </section>

      <AnimatePresence>
        {done && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 px-5"
          >
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Yuz shakli: Oval
                </p>
                <h2 className="text-lg font-bold tracking-tight">3 ta tavsiya</h2>
              </div>
              <span className="rounded-full bg-foreground px-2.5 py-1 text-[10px] font-bold text-background">
                AI
              </span>
            </div>
            <div className="space-y-3">
              {SUGGESTIONS.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-3 rounded-2xl border border-border bg-background p-3"
                >
                  <div
                    className="h-20 w-20 shrink-0 rounded-xl"
                    style={{
                      background: `linear-gradient(135deg, oklch(0.78 0.12 ${s.hue}), oklch(0.42 0.08 ${(s.hue + 60) % 360}))`,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate text-sm font-bold">{s.title}</h3>
                      <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold">
                        {s.match}% mos
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[12px] text-muted-foreground">{s.desc}</p>
                    <Link
                      to="/stylists"
                      className="mt-2 inline-flex items-center text-[11px] font-bold underline"
                    >
                      Bu uslubni qiladigan ustani topish →
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
