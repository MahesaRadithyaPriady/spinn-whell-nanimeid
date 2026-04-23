"use client";

import Image from "next/image";
import {
  AlarmClock,
  Circle,
  Clock,
  Coins,
  Flame,
  Gift,
  ShieldAlert,
  Sparkles,
  Star,
  Ticket,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";

type SpinReward = {
  id: string;
  label: string;
  amount?: number | null;
  imageUrl?: string | null;
  prizeType?: string | null;
  slotIndex?: number | null;
  rarity: "common" | "rare" | "epic" | "special" | "unlucky";
};

type ApiPrizeTier =
  | "COMMON"
  | "RARE"
  | "EPIC"
  | "SSS_PLUS"
  | "SSS"
  | "SS"
  | "S"
  | "A"
  | "B"
  | "C"
  | string;

type ApiPrize = {
  id: string;
  type: string;
  label: string;
  amount?: number | null;
  tier?: ApiPrizeTier | null;
  image_url?: string | null;
  slotIndex?: number | null;
};

type GachaPrizesResponse =
  | {
      success: true;
      event_code: string;
      cost_per_spin?: number | null;
      cost_per_10?: number | null;
      prizes: ApiPrize[];
    }
  | { success: false; message?: string };

type GachaStateResponse =
  | {
      success: true;
      balance: number;
      sharpTokens: number;
      starts_at?: string;
      ends_at?: string;
      freeSpinAvailable?: boolean;
      nextFreeSpinAt?: string | null;
      freeSpinCooldownSeconds?: number;
      pitySpins: number;
      pityRemaining: number;
    }
  | { success: false; message?: string };

type GachaSpinResponse =
  | {
      success: true;
      prize: {
        id?: string;
        type?: string;
        label?: string;
        amount?: number | null;
        tier?: ApiPrizeTier | null;
        image_url?: string | null;
        slotIndex: number | null;
      };
      prizes?: Array<{
        id?: string;
        type?: string | null;
        label?: string | null;
        amount?: number | null;
        tier?: ApiPrizeTier | null;
        image_url?: string | null;
        slotIndex?: number | null;
      }>;
      count?: number;
      sharpTokensWon?: number;
      freeSpinUsed?: boolean;
      freeSpinAvailable?: boolean;
      nextFreeSpinAt?: string | null;
      freeSpinCooldownSeconds?: number;
      coinsSpent?: number;
      balance: number;
      sharpTokens: number;
      pitySpins: number;
      pityRemaining: number;
    }
  | { success: false; message?: string };

type AuthLoginResponse =
  | {
      message?: string;
      status?: number;
      token: string;
      refreshToken: string;
      user?: {
        id?: number;
        userID?: number;
        username?: string;
        email?: string;
      };
    }
  | {
      error?: string;
      message?: string;
      status?: number;
    };

type GachaShopItem = {
  code: string;
  type: string;
  title: string;
  image_url?: string | null;
  sharp_cost: number;
};

type GachaShopItemsResponse =
  | {
      success: true;
      items: GachaShopItem[];
    }
  | { success: false; message?: string };

type GachaShopExchangeResponse =
  | {
      success: true;
      prize?: {
        id?: string;
        type?: string;
        label?: string;
        image_url?: string | null;
        tier?: ApiPrizeTier | null;
        border_id?: number | null;
        code?: string;
      };
      sharpTokens: number;
    }
  | { success: false; message?: string };

type StoreWalletResponse =
  | {
      user_id?: number;
      balance_coins: number;
    }
  | {
      message?: string;
    };

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatHMS(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
}

function getNextDailyResetSeconds(now: Date) {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
}

const ITEM_H = 96;
const SPIN_SPEED = 800; // px/s saat full speed
const DECEL_DURATION = 600; // ms untuk melambat ke target

const SlotReel = memo(function SlotReel({
  segments,
  result,
  isSpinning,
  isSlotPaused,
  reelIdx,
  isHighlighted,
}: {
  segments: SpinReward[];
  result: SpinReward | null;
  isSpinning: boolean;
  isSlotPaused: boolean;
  reelIdx: number;
  isHighlighted: boolean;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const offsetRef = useRef(0);
  const phaseRef = useRef<"idle" | "spin" | "decel">("idle");
  const decelStartRef = useRef(0);
  const decelFromRef = useRef(0);
  const decelToRef = useRef(0);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;

    const totalH = segments.length * ITEM_H;

    if (!isSpinning || isSlotPaused) {
      // Langsung snap ke posisi tengah result
      cancelAnimationFrame(rafRef.current);
      phaseRef.current = "idle";
      if (result && segments.length) {
        const idx = segments.findIndex(s => s.id === result.id);
        const targetIdx = idx >= 0 ? idx : 0;
        // posisi yang menempatkan item tepat di tengah viewport (h-24)
        const targetOffset = (targetIdx * ITEM_H) % totalH;
        offsetRef.current = targetOffset;
        strip.style.transform = `translateY(-${targetOffset}px)`;
      } else {
        strip.style.transform = "translateY(0)";
        offsetRef.current = 0;
      }
      return;
    }

    // Mulai spin
    phaseRef.current = "spin";
    let last = performance.now();

    // delay start per reel supaya terasa asinkron
    const startDelay = reelIdx * 60;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (phaseRef.current === "spin") {
        offsetRef.current = (offsetRef.current + SPIN_SPEED * dt) % totalH;
        strip.style.transform = `translateY(-${offsetRef.current}px)`;
      } else if (phaseRef.current === "decel") {
        const elapsed = now - decelStartRef.current;
        const t = Math.min(elapsed / DECEL_DURATION, 1);
        // ease-out cubic
        const ease = 1 - Math.pow(1 - t, 3);
        const cur = decelFromRef.current + (decelToRef.current - decelFromRef.current) * ease;
        strip.style.transform = `translateY(-${cur}px)`;
        if (t >= 1) {
          offsetRef.current = decelToRef.current % totalH;
          phaseRef.current = "idle";
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    const timeout = setTimeout(() => {
      rafRef.current = requestAnimationFrame(tick);
    }, startDelay);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(rafRef.current);
    };
  }, [isSpinning, isSlotPaused, segments, result, reelIdx]);

  // Trigger decel saat result masuk dan masih spinning
  useEffect(() => {
    if (!result || !isSpinning || isSlotPaused) return;
    const totalH = segments.length * ITEM_H;
    const idx = segments.findIndex(s => s.id === result.id);
    const targetIdx = idx >= 0 ? idx : 0;

    // hitung target offset: selalu maju ke depan dari posisi saat ini
    let targetOffset = (targetIdx * ITEM_H) % totalH;
    const cur = offsetRef.current % totalH;
    if (targetOffset <= cur) targetOffset += totalH;
    // tambah satu putaran penuh supaya ada jarak melambat
    targetOffset += totalH;

    decelFromRef.current = offsetRef.current;
    decelToRef.current = targetOffset;
    decelStartRef.current = performance.now() + reelIdx * 80;
    phaseRef.current = "decel";
  }, [result, isSpinning, isSlotPaused, segments, reelIdx]);

  const displaySeg = result ?? segments[reelIdx % segments.length]!;

  const renderIcon = (seg: SpinReward) =>
    seg.imageUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={seg.imageUrl} alt={seg.label} className="h-8 w-8 rounded-lg border border-white/10 object-cover" />
    ) : seg.prizeType === "border" ? (
      <Gift className="h-7 w-7 text-rose-300" />
    ) : seg.prizeType === "coin" ? (
      <Coins className="h-7 w-7 text-amber-300" />
    ) : seg.prizeType === "sharp_token" || seg.label?.toLowerCase().includes("token") ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/img/sharp.png" alt="Sharp Token" className="h-7 w-7 rounded-md" />
    ) : seg.rarity === "unlucky" ? (
      <XCircle className="h-7 w-7 text-zinc-500" />
    ) : (
      <Star className="h-7 w-7 text-cyan-300" />
    );

  const renderLabel = (seg: SpinReward) => (
    <span className="line-clamp-1 text-center text-[10px] text-zinc-300">
      {seg.amount != null ? `${seg.label} +${seg.amount}` : seg.label}
    </span>
  );

  return (
    <div
      className={`relative flex h-24 flex-1 overflow-hidden rounded-2xl border bg-zinc-900 transition-colors duration-300 ${
        isHighlighted ? "border-rose-400/60 shadow-[0_0_20px_rgba(244,63,94,0.35)]" : "border-white/10"
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-zinc-900 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-zinc-900 to-transparent" />

      {/* Strip selalu di DOM, digerakkan rAF */}
      <div ref={stripRef} className="flex w-full flex-col" style={{ willChange: "transform" }}>
        {[...segments, ...segments, ...segments].map((seg, si) => (
          <div key={si} style={{ height: ITEM_H, flexShrink: 0 }} className="flex w-full flex-col items-center justify-center gap-1 px-2">
            {renderIcon(seg)}
            {renderLabel(seg)}
          </div>
        ))}
      </div>

      {/* Overlay result saat idle */}
      {(!isSpinning || isSlotPaused) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-zinc-900 px-2">
          {renderIcon(displaySeg)}
          {renderLabel(displaySeg)}
        </div>
      )}
    </div>
  );
});

const SPECIAL_STARS = Array.from({ length: 20 }, (_, i) => {
  const angle = (i / 20) * 360 + (i % 2 === 0 ? 9 : 0);
  const dist = 55 + (i % 3) * 35;
  return {
    tx: Math.round(Math.cos((angle * Math.PI) / 180) * dist),
    ty: Math.round(Math.sin((angle * Math.PI) / 180) * dist),
    tr: (i * 37) % 360,
    delay: (i * 0.045).toFixed(3),
    size: 10 + (i % 5) * 3,
  };
});

function SpecialBurstOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden rounded-3xl">
      {/* radial amber glow */}
      <div className="special-overlay absolute inset-0 rounded-3xl bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.6)_0%,rgba(251,191,36,0.18)_45%,transparent_70%)]" />
      {/* bintang meledak dari tengah */}
      {SPECIAL_STARS.map((s, i) => (
        <div
          key={i}
          className="special-star absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-300"
          style={{
            ["--tx" as string]: `${s.tx}px`,
            ["--ty" as string]: `${s.ty}px`,
            ["--tr" as string]: `${s.tr}deg`,
            animationDelay: s.delay + "s",
            fontSize: s.size,
            lineHeight: 1,
          }}
        >
          ★
        </div>
      ))}
      {/* label SPECIAL */}
      <div className="special-overlay absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
        <span className="special-glow inline-block rounded-full bg-amber-400/20 px-5 py-1 text-sm font-bold tracking-widest text-amber-300 shadow-[0_0_28px_rgba(251,191,36,0.7)]">
          ✦ SPECIAL ✦
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "";
  const apiVersion = process.env.NEXT_PUBLIC_API_VERSION ?? "";
  const debugLoginEnabled = process.env.NEXT_PUBLIC_DEBUG_LOGIN === "true";
  const [eventCode, setEventCode] = useState<string | null>(null);
  const [missingEventCode, setMissingEventCode] = useState(false);
  const [spinMode, setSpinMode] = useState<"wheel" | "slot">("wheel");

  const [prizePool, setPrizePool] = useState<SpinReward[]>([]);

  const rarityFromTier = useCallback(
    (tier?: ApiPrizeTier | null): SpinReward["rarity"] => {
      const t = String(tier ?? "").toUpperCase();
      if (t === "COMMON" || t === "C" || t === "B") return "common";
      if (t === "RARE" || t === "A" || t === "S") return "rare";
      if (t === "EPIC" || t === "SS") return "epic";
      if (t === "SSS" || t === "SSS_PLUS") return "special";
      return "unlucky";
    },
    [],
  );

  const toSpinReward = useCallback(
    (p: ApiPrize): SpinReward => {
      return {
        id: p.id,
        label: p.label,
        amount: p.amount ?? null,
        imageUrl: p.image_url ?? null,
        prizeType: p.type ?? null,
        slotIndex: p.slotIndex ?? null,
        rarity: rarityFromTier(p.tier ?? null),
      };
    },
    [rarityFromTier],
  );

  const isZonkPrize = (p?: SpinReward | null) => {
    if (!p) return false;
    const t = String(p.prizeType ?? "").toLowerCase();
    const id = String(p.id ?? "").toLowerCase();
    const label = String(p.label ?? "").toLowerCase();
    return t === "zonk" || id === "zonk" || label === "zonk";
  };

  const isSharpTokenPrize = (p?: SpinReward | null) => {
    if (!p) return false;
    const t = String(p.prizeType ?? "").toLowerCase();
    const id = String(p.id ?? "").toLowerCase();
    const label = String(p.label ?? "").toLowerCase();

    const tokenLike =
      t === "token" ||
      t.includes("token") ||
      t.includes("sharp") ||
      id.includes("sharp") ||
      id.includes("token") ||
      label.includes("sharp") ||
      label.includes("token");

    return tokenLike && !isZonkPrize(p);
  };

  const borderPrizes = useMemo(
    () => prizePool.filter((p) => p.prizeType === "border"),
    [prizePool],
  );

  const wheelSegments: SpinReward[] = useMemo(() => {
    if (!prizePool.length) return [];

    const map = new Map<number, SpinReward>();
    const unassigned: SpinReward[] = [];

    for (const p of prizePool) {
      const idx = p.slotIndex;
      const valid =
        typeof idx === "number" && Number.isFinite(idx) && idx >= 0;

      if (valid && !map.has(idx!)) {
        map.set(idx!, p);
      } else {
        unassigned.push(p);
      }
    }

    const slots = prizePool.length;
    const out: SpinReward[] = [];
    for (let i = 0; i < slots; i++) {
      const hit = map.get(i);
      if (hit) {
        out.push(hit);
      } else {
        const fill = unassigned.shift();
        if (fill) {
          out.push({ ...fill, slotIndex: i });
        }
      }
    }

    for (const leftover of unassigned) {
      out.push(leftover);
    }

    return out;
  }, [prizePool]);

  const segmentAngle = wheelSegments.length ? 360 / wheelSegments.length : 45;

  const wheelBg = useMemo(() => {
    const palette = [
      "rgba(34,211,238,0.18)",
      "rgba(217,70,239,0.18)",
      "rgba(245,158,11,0.16)",
      "rgba(34,197,94,0.16)",
      "rgba(59,130,246,0.18)",
      "rgba(244,63,94,0.18)",
      "rgba(168,85,247,0.18)",
      "rgba(14,165,233,0.18)",
    ];

    const alphaBoostFor = (seg: SpinReward) => {
      if (seg.rarity === "special") return 0.06;
      if (seg.rarity === "epic") return 0.05;
      if (seg.rarity === "rare") return 0.03;
      return 0;
    };

    const colorForIndex = (i: number, seg: SpinReward) => {
      const base = palette[i % palette.length];
      const boost = alphaBoostFor(seg);
      if (!boost) return base;
      // convert `rgba(r,g,b,a)` by replacing alpha with alpha+boost (clamped)
      const m = base.match(/rgba\((\d+),(\d+),(\d+),([0-9.]+)\)/);
      if (!m) return base;
      const a = Math.min(0.3, Number(m[4]) + boost);
      return `rgba(${m[1]},${m[2]},${m[3]},${a})`;
    };

    const stops = wheelSegments
      .map((seg, i) => {
        const start = i * segmentAngle;
        const end = (i + 1) * segmentAngle;
        return `${colorForIndex(i, seg)} ${start}deg ${end}deg`;
      })
      .join(", ");

    return `conic-gradient(from -90deg, ${stops})`;
  }, [segmentAngle, wheelSegments]);

  const [, setResetSeconds] = useState(() =>
    getNextDailyResetSeconds(new Date()),
  );
  const [isSpinning, setIsSpinning] = useState(false);
  const [isSlotPaused, setIsSlotPaused] = useState(false);
  const [result, setResult] = useState<SpinReward | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  const [specialEffectKey, setSpecialEffectKey] = useState<number | null>(null);
  const specialShownThisSessionRef = useRef(false);
  const [userToken, setUserToken] = useState(0);
  const [, setBalance] = useState<number | null>(null);
  const [pitySpins, setPitySpins] = useState<number | null>(null);
  const [pityRemaining, setPityRemaining] = useState<number | null>(null);
  const [, setEventStartsAt] = useState<Date | null>(null);
  const [eventEndsAt, setEventEndsAt] = useState<Date | null>(null);
  const [eventNow, setEventNow] = useState(() => new Date());
  const [freeSpinAvailable, setFreeSpinAvailable] = useState<boolean | null>(null);
  const [nextFreeSpinAt, setNextFreeSpinAt] = useState<Date | null>(null);
  const [freeSpinCooldownSeconds, setFreeSpinCooldownSeconds] = useState<number | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [wheelRotation, setWheelRotation] = useState(0);

  const wheelRotationRef = useRef(0);
  useEffect(() => {
    wheelRotationRef.current = wheelRotation;
  }, [wheelRotation]);

  const spinQueueRef = useRef<
    Array<{ targetRotation: number; reward: SpinReward | null }>
  >([]);
  const spinQueueTotalRef = useRef(0);
  const spinQueueDoneRef = useRef(0);
  const [authState, setAuthState] = useState<"checking" | "allowed" | "denied">(
    "checking",
  );

  const [debugUsername, setDebugUsername] = useState("");
  const [debugPassword, setDebugPassword] = useState("");
  const [debugLoginLoading, setDebugLoginLoading] = useState(false);
  const [debugLoginError, setDebugLoginError] = useState<string | null>(null);

  const [shopItems, setShopItems] = useState<GachaShopItem[]>([]);
  const [shopLoading, setShopLoading] = useState(false);
  const [shopError, setShopError] = useState(false);
  const [exchangeLoadingCode, setExchangeLoadingCode] = useState<string | null>(
    null,
  );
  const [exchangeError, setExchangeError] = useState(false);
  const [exchangeSuccessKey, setExchangeSuccessKey] = useState(0);

  const [walletCoins, setWalletCoins] = useState<number | null>(null);
  const [walletError, setWalletError] = useState(false);

  const [spinHistory, setSpinHistory] = useState<SpinReward[]>([]);

  const logApi = (label: string, data: unknown) => {
    // eslint-disable-next-line no-console
    console.log(`[API] ${label}`, data);
  };

  const refreshWallet = useCallback(
    async (token?: string | null) => {
      const t = token ?? sessionStorage.getItem("access_token");
      if (!t) {
        setAuthState("denied");
        return;
      }

      setWalletError(false);
      try {
        const res = await fetch(`${apiBase}/${apiVersion}/store/wallet`, {
          headers: {
            Authorization: `Bearer ${t}`,
          },
        });

        if (res.status === 401) {
          setAuthState("denied");
          return;
        }

        const data = (await res.json()) as StoreWalletResponse;
        logApi("store/wallet", data);
        if (!res.ok || (data as { message?: string }).message) {
          setWalletError(true);
          return;
        }

        setWalletCoins((data as { balance_coins: number }).balance_coins);
      } catch {
        setWalletError(true);
      }
    },
    [apiBase, apiVersion],
  );

  async function handleDebugLogin() {
    setDebugLoginLoading(true);
    setDebugLoginError(null);
    setApiError(null);

    try {
      const res = await fetch(`${apiBase}/${apiVersion}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: debugUsername,
          password: debugPassword,
        }),
      });

      const data = (await res.json()) as AuthLoginResponse;
      logApi("auth/login", data);
      const token = "token" in data ? data.token : null;
      const refreshToken = "refreshToken" in data ? data.refreshToken : null;

      if (!res.ok || !token || !refreshToken) {
        const msg =
          ("message" in data && typeof data.message === "string" && data.message)
            ? data.message
            : ("error" in data && typeof data.error === "string" && data.error)
              ? data.error
              : "Username atau password salah";
        setDebugLoginError(msg);
        setDebugLoginLoading(false);
        return;
      }

      sessionStorage.setItem("access_token", token);
      sessionStorage.setItem("refresh_token", refreshToken);
      setAuthState("allowed");
      setDebugLoginLoading(false);
    } catch {
      setDebugLoginError("Tidak dapat terhubung ke server");
      setDebugLoginLoading(false);
    }
  }

  const renderDebugLoginPanel = () => {
    return (
      <div className="mt-6 w-full rounded-3xl border border-white/10 bg-white/5 p-5 text-left">
        <div className="text-sm font-semibold text-zinc-100">Login</div>
        <div className="mt-3 grid gap-3">
          <label className="grid gap-1 text-xs text-zinc-200/70">
            Username
            <input
              value={debugUsername}
              onChange={(e) => { setDebugUsername(e.target.value); setDebugLoginError(null); }}
              className="h-11 rounded-2xl border border-white/10 bg-zinc-950/60 px-4 text-sm text-zinc-50 outline-none focus:border-rose-400/40"
              autoComplete="username"
            />
          </label>

          <label className="grid gap-1 text-xs text-zinc-200/70">
            Password
            <input
              value={debugPassword}
              onChange={(e) => { setDebugPassword(e.target.value); setDebugLoginError(null); }}
              className="h-11 rounded-2xl border border-white/10 bg-zinc-950/60 px-4 text-sm text-zinc-50 outline-none focus:border-rose-400/40"
              type="password"
              autoComplete="current-password"
            />
          </label>

          <button
            onClick={handleDebugLogin}
            disabled={debugLoginLoading || !debugUsername || !debugPassword}
            className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-rose-500 to-pink-400 px-6 text-sm font-semibold text-zinc-950 transition hover:brightness-110 disabled:opacity-60"
          >
            {debugLoginLoading ? "MASUK..." : "MASUK"}
          </button>
        </div>
      </div>
    );
  };

  const pendingRewardRef = useRef<SpinReward | null>(null);
  const pendingStateRef = useRef<
    | {
        balance: number;
        sharpTokens: number;
        pitySpins: number;
        pityRemaining: number;
      }
    | null
  >(null);
  const spinDurationMs = 1900;

  useEffect(() => {
    const url = new URL(window.location.href);

    const extractParams = (raw: string) => {
      const s = raw.startsWith("?") || raw.startsWith("#") ? raw.slice(1) : raw;
      return new URLSearchParams(s);
    };

    const q = url.searchParams;
    const h = url.hash ? extractParams(url.hash) : new URLSearchParams();

    const urlEventCodeRaw = q.get("event_code");
    const normalizedEventCode = urlEventCodeRaw
      ? String(urlEventCodeRaw).trim().toUpperCase()
      : "";

    const applyState = () => {
      if (normalizedEventCode) {
        setEventCode(normalizedEventCode);
        setMissingEventCode(false);
        q.set("event_code", normalizedEventCode);
      } else {
        setEventCode(null);
        setMissingEventCode(true);
        q.delete("event_code");
      }
    };

    queueMicrotask(applyState);

    const modeRaw = q.get("mode");
    if (modeRaw === "slot") setSpinMode("slot");
    else setSpinMode("wheel");

    const accessToken = q.get("access_token") ?? h.get("access_token");
    const refreshToken = q.get("refresh_token") ?? h.get("refresh_token");

    if (accessToken) sessionStorage.setItem("access_token", accessToken);
    if (refreshToken) sessionStorage.setItem("refresh_token", refreshToken);

    if (accessToken || refreshToken) {
      q.delete("access_token");
      q.delete("refresh_token");

      url.hash = "";

      const newSearch = q.toString();
      const cleaned = `${url.pathname}${newSearch ? `?${newSearch}` : ""}`;
      window.history.replaceState({}, "", cleaned);
    }

    const storedAccess = sessionStorage.getItem("access_token");
    const storedRefresh = sessionStorage.getItem("refresh_token");
    queueMicrotask(() => {
      setAuthState(storedAccess && storedRefresh ? "allowed" : "denied");
    });
  }, []);

  useEffect(() => {
    if (!eventCode) return;
    const run = async () => {
      setApiError(null);
      try {
        const res = await fetch(
          `${apiBase}/${apiVersion}/events/gacha/prizes?event_code=${encodeURIComponent(eventCode)}`,
        );
        const data = (await res.json()) as GachaPrizesResponse;
        logApi("events/gacha/prizes", data);
        if (!res.ok || !data.success) {
          const msg = !data.success && "message" in data && data.message ? data.message : null;
          setApiError(msg ?? `Gagal memuat prize pool (HTTP ${res.status})`);
          return;
        }

        const normalized = (data.prizes ?? []).map(toSpinReward);
        setPrizePool(normalized);
      } catch (err) {
        setApiError(`Tidak dapat terhubung ke server saat memuat prize pool. ${String(err)}`);
      }
    };

    void run();
  }, [apiBase, apiVersion, eventCode, toSpinReward]);

  useEffect(() => {
    if (authState !== "allowed") return;
    if (!eventCode) return;
    if (!eventCode) return;

    const run = async () => {
      setApiError(null);

      const token = sessionStorage.getItem("access_token");
      if (!token) {
        setAuthState("denied");
        return;
      }

      try {
        const res = await fetch(
          `${apiBase}/${apiVersion}/events/gacha/state?event_code=${encodeURIComponent(eventCode)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (res.status === 401) {
          setAuthState("denied");
          return;
        }

        const data = (await res.json()) as GachaStateResponse;
        logApi("events/gacha/state", data);
        if (!res.ok || !data.success) {
          const msg = !data.success && "message" in data && data.message ? data.message : null;
          setApiError(msg ?? `Gagal memuat status event (HTTP ${res.status})`);
          return;
        }

        setBalance(data.balance);
        setUserToken(data.sharpTokens);
        setPitySpins(data.pitySpins);
        setPityRemaining(data.pityRemaining);
        setEventStartsAt(data.starts_at ? new Date(data.starts_at) : null);
        setEventEndsAt(data.ends_at ? new Date(data.ends_at) : null);
        setFreeSpinAvailable(data.freeSpinAvailable ?? null);
        setNextFreeSpinAt(data.nextFreeSpinAt ? new Date(data.nextFreeSpinAt) : null);
        setFreeSpinCooldownSeconds(data.freeSpinCooldownSeconds ?? null);
      } catch (err) {
        setApiError(`Tidak dapat terhubung ke server saat memuat status event. ${String(err)}`);
      }
    };

    void run();
  }, [apiBase, apiVersion, authState, eventCode]);

  useEffect(() => {
    if (authState !== "allowed") return;

    const run = async () => {
      setWalletError(false);

      const token = sessionStorage.getItem("access_token");
      if (!token) {
        setAuthState("denied");
        return;
      }

      try {
        await refreshWallet(token);
      } catch {
        setWalletError(true);
      }
    };

    void run();
  }, [authState, refreshWallet]);

  useEffect(() => {
    if (authState !== "allowed") return;

    const run = async () => {
      setShopError(false);
      setShopLoading(true);

      if (!eventCode) {
        setShopError(true);
        setShopLoading(false);
        return;
      }

      const token = sessionStorage.getItem("access_token");
      if (!token) {
        setAuthState("denied");
        setShopLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `${apiBase}/${apiVersion}/events/gacha/shop/items?event_code=${encodeURIComponent(eventCode)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (res.status === 401) {
          setAuthState("denied");
          setShopLoading(false);
          return;
        }

        const data = (await res.json()) as GachaShopItemsResponse;
        logApi("events/gacha/shop/items", data);
        if (!res.ok || !data.success) {
          setShopError(true);
          setShopLoading(false);
          return;
        }

        setShopItems(data.items ?? []);
        setShopLoading(false);
      } catch {
        setShopError(true);
        setShopLoading(false);
      }
    };

    void run();
  }, [apiBase, apiVersion, authState, eventCode]);

  async function handleExchange(code: string) {
    if (exchangeLoadingCode) return;
    if (authState !== "allowed") return;
    if (!eventCode) return;

    setExchangeError(false);
    setExchangeLoadingCode(code);

    const token = sessionStorage.getItem("access_token");
    if (!token) {
      setAuthState("denied");
      setExchangeLoadingCode(null);
      return;
    }

    try {
      const res = await fetch(`${apiBase}/${apiVersion}/events/gacha/shop/exchange`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      if (res.status === 401) {
        setAuthState("denied");
        setExchangeLoadingCode(null);
        return;
      }

      const data = (await res.json()) as GachaShopExchangeResponse;
      logApi("events/gacha/shop/exchange", data);
      if (!res.ok || !data.success) {
        setExchangeError(true);
        setExchangeLoadingCode(null);
        return;
      }

      setUserToken(data.sharpTokens);
      setExchangeSuccessKey((k) => k + 1);
      setExchangeLoadingCode(null);
    } catch {
      setExchangeError(true);
      setExchangeLoadingCode(null);
    }
  }

  useEffect(() => {
    const t = window.setInterval(() => {
      setEventNow(new Date());
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  const msRemaining = eventEndsAt ? eventEndsAt.getTime() - eventNow.getTime() : null;
  const daysRemaining =
    msRemaining != null ? Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000))) : null;

  const eventCountdownLabel = useMemo(() => {
    if (msRemaining == null) return "-";
    if (msRemaining <= 0) return "Event berakhir";
    if (daysRemaining != null) return `${daysRemaining} Hari Lagi`;
    return "-";
  }, [daysRemaining, msRemaining]);

  const showEndingSoonBadge = daysRemaining != null && daysRemaining <= 3 && daysRemaining > 0;

  const resolvedFreeSpinAvailable = useMemo(() => {
    if (typeof freeSpinAvailable === "boolean") return freeSpinAvailable;
    if (typeof freeSpinCooldownSeconds === "number") {
      return freeSpinCooldownSeconds <= 0;
    }
    if (nextFreeSpinAt) {
      return nextFreeSpinAt.getTime() <= eventNow.getTime();
    }
    return null;
  }, [eventNow, freeSpinAvailable, freeSpinCooldownSeconds, nextFreeSpinAt]);

  const freeSpinSecondsRemaining = useMemo(() => {
    if (resolvedFreeSpinAvailable !== false) return null;
    if (nextFreeSpinAt) {
      const ms = nextFreeSpinAt.getTime() - eventNow.getTime();
      return Math.max(0, Math.ceil(ms / 1000));
    }
    return typeof freeSpinCooldownSeconds === "number" ? freeSpinCooldownSeconds : null;
  }, [eventNow, freeSpinCooldownSeconds, nextFreeSpinAt, resolvedFreeSpinAvailable]);

  useEffect(() => {
    const t = window.setInterval(() => {
      setResetSeconds(getNextDailyResetSeconds(new Date()));
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  const pityTotal = (pitySpins ?? 0) + (pityRemaining ?? 0);
  const pityPct = pityTotal
    ? Math.min(100, Math.round(((pitySpins ?? 0) / pityTotal) * 100))
    : 0;

  async function handleSpin(count: number) {
    if (isSpinning) return;
    if (authState !== "allowed") return;
    if (!eventCode) return;
    if (apiError) return;
    if (wheelSegments.length === 0) return;

    setIsSpinning(true);
    setResult(null);
    setSpinHistory([]);

    const token = sessionStorage.getItem("access_token");
    if (!token) {
      setAuthState("denied");
      return;
    }

    let apiPrizeReward: SpinReward | null = null;
    let prizesFromApi: Array<{
      id?: string;
      type?: string | null;
      label?: string | null;
      amount?: number | null;
      image_url?: string | null;
      tier?: string | null;
      slotIndex?: number | null;
    }> = [];
    try {
      const res = await fetch(
        `${apiBase}/${apiVersion}/events/gacha/spin?count=${count}&event_code=${encodeURIComponent(eventCode)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ count }),
        },
      );

      if (res.status === 401) {
        setAuthState("denied");
        setIsSpinning(false);
        return;
      }

      const data = (await res.json()) as GachaSpinResponse;
      logApi("events/gacha/spin", data);
      if (!res.ok || !data.success) {
        const msg = !data.success && "message" in data && data.message ? data.message : null;
        setApiError(msg ?? `Spin gagal (HTTP ${res.status})`);
        setIsSpinning(false);
        return;
      }

      prizesFromApi = (data.prizes ?? []) as typeof prizesFromApi;

      const isPityFallbackCoin =
        data.pityRemaining === 0 &&
        String(data.prize?.type ?? "").toLowerCase() === "coin";

      if (data.prize) {
        const amountFromApi = data.prize.amount ?? null;
        const amount =
          isPityFallbackCoin && (amountFromApi == null || amountFromApi <= 0)
            ? 15000
            : amountFromApi;

        const labelFromApi = data.prize.label ?? "Hadiah";
        const label = isPityFallbackCoin
          ? amount != null
            ? `COIN ${amount}`
            : "COIN 15000"
          : labelFromApi;

        apiPrizeReward = {
          id: data.prize.id ?? "prize",
          label,
          amount,
          imageUrl: data.prize.image_url ?? null,
          prizeType: data.prize.type ?? null,
          slotIndex: data.prize.slotIndex ?? null,
          rarity: rarityFromTier(data.prize.tier ?? null),
        };
      }
      pendingStateRef.current = {
        balance: data.balance,
        sharpTokens: data.sharpTokens,
        pitySpins: data.pitySpins,
        pityRemaining: data.pityRemaining,
      };

      if (typeof data.freeSpinAvailable === "boolean") {
        setFreeSpinAvailable(data.freeSpinAvailable);
      }
      if (data.nextFreeSpinAt !== undefined) {
        setNextFreeSpinAt(data.nextFreeSpinAt ? new Date(data.nextFreeSpinAt) : null);
      }
      if (typeof data.freeSpinCooldownSeconds === "number") {
        setFreeSpinCooldownSeconds(data.freeSpinCooldownSeconds);
      }
    } catch (err) {
      setApiError(`Tidak dapat terhubung ke server saat spin. ${String(err)}`);
      setIsSpinning(false);
      return;
    }

    const spins = 6;
    const buildRewardFromPrize = (p: (typeof prizesFromApi)[number]) => {
      const prizeType = p.type ?? null;

      const isPityFallbackCoin =
        pendingStateRef.current?.pityRemaining === 0 &&
        String(prizeType ?? "").toLowerCase() === "coin";

      const amountFromApi = p.amount ?? null;
      const amount =
        isPityFallbackCoin && (amountFromApi == null || amountFromApi <= 0)
          ? 15000
          : amountFromApi;

      const labelFromApi = p.label ?? "Hadiah";
      const label = isPityFallbackCoin
        ? amount != null
          ? `COIN ${amount}`
          : "COIN 15000"
        : labelFromApi;

      return {
        id: p.id ?? "prize",
        label,
        amount,
        imageUrl: p.image_url ?? null,
        prizeType,
        slotIndex: p.slotIndex ?? null,
        rarity: rarityFromTier(p.tier ?? null),
      } satisfies SpinReward;
    };

    const pickIndexForReward = (r: SpinReward) => {
      const slotIndex = r.slotIndex ?? null;
      const pickedIndexFromPrizeId =
        r.id != null ? wheelSegments.findIndex((seg) => seg.id === r.id) : -1;

      const pickedIndexFromCoinFallback =
        slotIndex == null && String(r.prizeType ?? "").toLowerCase() === "coin"
          ? wheelSegments.findIndex(
              (seg) => String(seg.prizeType ?? "").toLowerCase() === "coin",
            )
          : -1;

      const pickedIndexRaw =
        slotIndex ??
        (pickedIndexFromCoinFallback >= 0 ? pickedIndexFromCoinFallback : null) ??
        (pickedIndexFromPrizeId >= 0
          ? pickedIndexFromPrizeId
          : Math.floor(Math.random() * wheelSegments.length));

      return (
        ((pickedIndexRaw % wheelSegments.length) + wheelSegments.length) %
        wheelSegments.length
      );
    };

    const rewards =
      count === 10 && prizesFromApi.length
        ? prizesFromApi.map(buildRewardFromPrize)
        : apiPrizeReward
          ? [apiPrizeReward]
          : [];

    setSpinHistory(rewards);

    const queue: Array<{ targetRotation: number; reward: SpinReward | null }> = [];
    let currentRotation = wheelRotationRef.current;
    for (const r of rewards) {
      const pickedIndex = pickIndexForReward(r);
      const pickedCenter = pickedIndex * segmentAngle + segmentAngle / 2;
      const jitter = (Math.random() - 0.5) * (segmentAngle * 0.18);
      const alignToPointer = 0 - pickedCenter + jitter;
      const currentMod = ((currentRotation % 360) + 360) % 360;
      const targetRotation =
        currentRotation + spins * 360 + alignToPointer - currentMod;

      const segAtIndex = wheelSegments[pickedIndex] ?? null;
      const segIsPlaceholder = segAtIndex?.id?.startsWith("empty-") ?? false;
      const finalReward =
        segAtIndex && !segIsPlaceholder ? segAtIndex : r ?? segAtIndex;

      queue.push({ targetRotation, reward: finalReward });
      currentRotation = targetRotation;
    }

    spinQueueRef.current = queue;
    spinQueueTotalRef.current = queue.length;
    spinQueueDoneRef.current = 0;
    specialShownThisSessionRef.current = false;

    const first = spinQueueRef.current.shift() ?? null;
    if (!first) {
      setIsSpinning(false);
      return;
    }

    pendingRewardRef.current = first.reward;

    if (spinMode === "slot") {
      const SPIN_DUR = spinDurationMs + DECEL_DURATION + 100; // tunggu decel selesai
      const PAUSE_DUR = 1000;
      const processQueue = (reward: SpinReward | null, remaining: typeof queue) => {
        const st = pendingStateRef.current;
        // 1. set result → trigger decel di SlotReel via useEffect
        setResult(reward);
        setFlashKey((k) => k + 1);
        if (reward?.rarity === "special" && !specialShownThisSessionRef.current) {
          specialShownThisSessionRef.current = true;
          setSpecialEffectKey(Date.now());
        }
        // 2. tunggu decel selesai → tampilkan overlay pause
        setTimeout(() => {
          setIsSlotPaused(true);
          const next = remaining[0] ?? null;
          if (next) {
            // 3. jeda user lihat result → mulai spin berikutnya
            setTimeout(() => {
              setResult(null);
              setIsSlotPaused(false);
              setTimeout(() => {
                pendingRewardRef.current = next.reward;
                processQueue(next.reward, remaining.slice(1));
              }, SPIN_DUR);
            }, PAUSE_DUR);
            return;
          }
          // 4. spin terakhir selesai
          setTimeout(() => {
            if (st) {
              setBalance(st.balance);
              setUserToken(st.sharpTokens);
              setPitySpins(st.pitySpins);
              setPityRemaining(st.pityRemaining);
              pendingStateRef.current = null;
            }
            void refreshWallet();
            setIsSpinning(false);
            setIsSlotPaused(false);
            pendingRewardRef.current = null;
          }, PAUSE_DUR);
        }, DECEL_DURATION + 100);
      };
      setTimeout(() => {
        processQueue(first.reward, queue);
      }, spinDurationMs);
    } else {
      setWheelRotation(first.targetRotation);
    }
  }

  if (authState === "checking") {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50">
        <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-zinc-200/80">
            Memuat...
          </div>
        </main>
      </div>
    );
  }

  if (authState === "denied") {
    if (debugLoginEnabled) {
      return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50">
          {/* Popup error toast */}
          {debugLoginError ? (
            <div className="fixed inset-x-0 top-6 z-50 flex justify-center px-4">
              <div className="flex w-full max-w-sm items-start gap-3 rounded-2xl border border-red-500/30 bg-zinc-900 px-5 py-4 shadow-[0_8px_32px_rgba(239,68,68,0.25)]">
                <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-red-300">Login gagal</div>
                  <div className="mt-0.5 text-xs text-zinc-300">{debugLoginError}</div>
                </div>
                <button onClick={() => setDebugLoginError(null)} className="flex-shrink-0 text-zinc-500 hover:text-zinc-200">
                  <XCircle className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          ) : null}
          <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col items-center justify-center px-4 py-10">
            <div className="w-full">
              <div className="mb-6 text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-sm text-zinc-100">
                  <Sparkles className="h-4 w-4 text-rose-300" aria-hidden />
                  <span className="font-semibold tracking-wide">GOTOUBUN NO HANAYOME</span>
                </div>
                <h1 className="mt-4 text-2xl font-semibold tracking-tight">Masuk untuk lanjut</h1>
                <p className="mt-2 text-sm text-zinc-200/70">Masukkan akun kamu untuk mengakses event spin.</p>
              </div>
              {renderDebugLoginPanel()}
            </div>
          </main>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50">
        <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-4 py-10 text-center">
          <div className="w-full rounded-3xl border border-red-500/20 bg-red-500/10 p-8 shadow-[0_0_40px_rgba(239,68,68,0.12)]">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-zinc-950/40">
              <ShieldAlert className="h-6 w-6 text-red-300" aria-hidden />
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Akses ditolak</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-200/80">
              Halaman ini tidak dapat dimuat saat ini. Silakan kembali dan coba lagi.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50">
        <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-4 py-10 text-center">
          <div className="w-full rounded-3xl border border-red-500/20 bg-red-500/10 p-8 shadow-[0_0_40px_rgba(239,68,68,0.12)]">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-zinc-950/40">
              <ShieldAlert className="h-6 w-6 text-red-300" aria-hidden />
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Terjadi kesalahan</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-200/80">
              Halaman ini tidak dapat dimuat saat ini. Silakan kembali dan coba lagi.
            </p>
            {debugLoginEnabled ? (
              <div className="mt-5 rounded-2xl border border-red-500/20 bg-zinc-950/50 px-4 py-3 text-left">
                <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-red-400">Detail Error</div>
                <p className="break-all font-mono text-xs leading-5 text-zinc-300">{apiError}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-400">
                  <span>API Base: <span className="font-mono text-zinc-200">{process.env.NEXT_PUBLIC_API_BASE ?? "(tidak di-set)"}</span></span>
                  <span>·</span>
                  <span>Event: <span className="font-mono text-zinc-200">{eventCode ?? "(tidak ada)"}</span></span>
                </div>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    );
  }

  if (missingEventCode) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50">
        <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-4 py-10 text-center">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-around items-end px-4 opacity-90">
            <div className="ketupat-swing">
              <Image
                src="/img/Ichika_Nakano_FULL_BODY.webp"
                width={100}
                height={240}
                alt="Ichika Nakano"
                className="h-40 w-auto object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                priority
              />
            </div>
            <div className="ketupat-swing ketupat-delay-1">
              <Image
                src="/img/Nino_Nakano_Short_Hair_FULL_BODY.webp"
                width={100}
                height={240}
                alt="Nino Nakano"
                className="h-44 w-auto object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
              />
            </div>
            <div className="ketupat-swing ketupat-delay-2">
              <Image
                src="/img/Miku_Nakano_FULL_BODY.webp"
                width={100}
                height={240}
                alt="Miku Nakano"
                className="h-48 w-auto object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
              />
            </div>
            <div className="ketupat-swing">
              <Image
                src="/img/Yotsuba_Nakano_FULL_BODY.webp"
                width={100}
                height={240}
                alt="Yotsuba Nakano"
                className="h-44 w-auto object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
              />
            </div>
            <div className="ketupat-swing ketupat-delay-1">
              <Image
                src="/img/Itsuki_Nakano_FULL_BODY.webp"
                width={100}
                height={240}
                alt="Itsuki Nakano"
                className="h-40 w-auto object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
              />
            </div>
          </div>

          <div className="w-full rounded-3xl border border-rose-400/20 bg-rose-500/10 p-8 shadow-[0_0_40px_rgba(244,63,94,0.10)]">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-400/20 bg-zinc-950/40">
              <ShieldAlert className="h-6 w-6 text-rose-200" aria-hidden />
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Event belum dipilih</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-200/80">
              Tambahkan parameter <span className="font-semibold">event_code</span> di URL untuk memuat event.
            </p>
            <p className="mt-3 text-xs text-zinc-200/70">
              Contoh: <span className="font-mono">?event_code=KODE_EVENT</span>
            </p>
            {debugLoginEnabled ? renderDebugLoginPanel() : null}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-rose-600/25 via-zinc-950 to-pink-400/15 p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-rose-500/25 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-pink-400/20 blur-3xl" />
            <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-violet-400/15 blur-3xl" />
          </div>

          <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-sm text-zinc-100">
                <Sparkles className="h-4 w-4 text-rose-300" aria-hidden />
                <span className="font-semibold tracking-wide">GOTOUBUN NO HANAYOME EVENT</span>
              </div>

              <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Putar spin & kumpulkan Sharp Token
              </h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-zinc-200/80">
                Dapatkan Avatar Border eksklusif Quintuplets!
              </p>

              <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-200/70">
                <Gift className="mr-2 inline-block h-4 w-4" aria-hidden />
                Border Gotoubun hanya tersedia di event ini dan tidak akan dijual ulang.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-100">
                  <Clock className="h-4 w-4" aria-hidden />
                  <span>{eventCountdownLabel}</span>
                </div>
              </div>

              <div className="mt-7 rounded-2xl border border-rose-400/10 bg-rose-500/5 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-zinc-200/80">Avatar Border</div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/img/sharp.png" alt="Sharp Token" className="h-3.5 w-3.5 rounded-sm" />
                    <span>99 Sharp Token</span>
                  </div>
                </div>
                <div className="mt-3 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {[
                    { src: "/img/border/ichka.png",  name: "Ichika" },
                    { src: "/img/border/Nino.png",   name: "Nino" },
                    { src: "/img/border/miku.png",   name: "Miku" },
                    { src: "/img/border/itsuki.png", name: "Itsuki" },
                  ].map((b) => (
                    <div key={b.name} className="group flex flex-shrink-0 flex-col items-center gap-1.5">
                      <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 transition-transform duration-200 group-hover:scale-105 group-hover:border-rose-400/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={b.src} alt={`Border ${b.name}`} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5" />
                      </div>
                      <span className="text-[11px] text-zinc-400 group-hover:text-zinc-200">{b.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile character stack — tampil di bawah teks, sembunyi di desktop */}
            <div className="relative h-48 w-full lg:hidden">
              <div className="absolute bottom-0 left-0 z-[1]">
                <Image src="/img/Ichika_Nakano_FULL_BODY.webp" width={90} height={220} alt="Ichika Nakano" className="h-36 w-auto object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.5)]" priority />
              </div>
              <div className="absolute bottom-0 left-[15%] z-[2]">
                <Image src="/img/Nino_Nakano_Short_Hair_FULL_BODY.webp" width={95} height={240} alt="Nino Nakano" className="h-40 w-auto object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.55)]" />
              </div>
              <div className="absolute bottom-0 left-1/2 z-[5] -translate-x-1/2">
                <Image src="/img/Miku_Nakano_FULL_BODY.webp" width={105} height={260} alt="Miku Nakano" className="h-48 w-auto object-contain drop-shadow-[0_10px_28px_rgba(0,0,0,0.7)]" />
              </div>
              <div className="absolute bottom-0 right-[15%] z-[2]">
                <Image src="/img/Yotsuba_Nakano_FULL_BODY.webp" width={95} height={240} alt="Yotsuba Nakano" className="h-40 w-auto object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.55)]" />
              </div>
              <div className="absolute bottom-0 right-0 z-[1]">
                <Image src="/img/Itsuki_Nakano_FULL_BODY.webp" width={90} height={220} alt="Itsuki Nakano" className="h-36 w-auto object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.5)]" />
              </div>
            </div>

            <div className="hidden lg:col-span-6 lg:block">
              <div className="relative h-80 w-full">
                {/* Ichika — paling belakang kiri */}
                <div className="absolute bottom-0 left-0 z-[1] transition-transform duration-300 hover:-translate-y-2">
                  <Image
                    src="/img/Ichika_Nakano_FULL_BODY.webp"
                    width={130}
                    height={340}
                    alt="Ichika Nakano"
                    className="h-60 w-auto object-contain drop-shadow-[0_12px_32px_rgba(0,0,0,0.5)]"
                    priority
                  />
                </div>
                {/* Nino — kiri tengah */}
                <div className="absolute bottom-0 left-[15%] z-[2] transition-transform duration-300 hover:-translate-y-2">
                  <Image
                    src="/img/Nino_Nakano_Short_Hair_FULL_BODY.webp"
                    width={140}
                    height={360}
                    alt="Nino Nakano"
                    className="h-[272px] w-auto object-contain drop-shadow-[0_12px_32px_rgba(0,0,0,0.55)]"
                  />
                </div>
                {/* Miku — paling depan tengah */}
                <div className="absolute bottom-0 left-1/2 z-[5] -translate-x-1/2 transition-transform duration-300 hover:-translate-y-2">
                  <Image
                    src="/img/Miku_Nakano_FULL_BODY.webp"
                    width={155}
                    height={400}
                    alt="Miku Nakano"
                    className="h-80 w-auto object-contain drop-shadow-[0_16px_40px_rgba(0,0,0,0.7)]"
                  />
                </div>
                {/* Yotsuba — kanan tengah */}
                <div className="absolute bottom-0 right-[15%] z-[2] transition-transform duration-300 hover:-translate-y-2">
                  <Image
                    src="/img/Yotsuba_Nakano_FULL_BODY.webp"
                    width={140}
                    height={360}
                    alt="Yotsuba Nakano"
                    className="h-[272px] w-auto object-contain drop-shadow-[0_12px_32px_rgba(0,0,0,0.55)]"
                  />
                </div>
                {/* Itsuki — paling belakang kanan */}
                <div className="absolute bottom-0 right-0 z-[1] transition-transform duration-300 hover:-translate-y-2">
                  <Image
                    src="/img/Itsuki_Nakano_FULL_BODY.webp"
                    width={130}
                    height={340}
                    alt="Itsuki Nakano"
                    className="h-60 w-auto object-contain drop-shadow-[0_12px_32px_rgba(0,0,0,0.5)]"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="spin" className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 lg:col-span-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-zinc-200/80">{spinMode === "slot" ? "SLOT MACHINE" : "SPIN WHEEL"}</div>
                <div className="mt-1 text-lg font-semibold">Putar untuk dapat hadiah</div>
              </div>
              <div className="grid justify-items-end gap-2">
                {showEndingSoonBadge ? (
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-zinc-50 shadow-[0_0_0_1px_rgba(239,68,68,0.12),0_0_40px_rgba(239,68,68,0.18)]">
                    <Flame className="h-4 w-4" aria-hidden />
                    <span className="font-semibold">
                      EVENT BERAKHIR {daysRemaining} HARI LAGI
                    </span>
                  </div>
                ) : null}
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-100">
                  <Coins className="h-4 w-4" aria-hidden />
                  <span>Wallet Coin</span>
                  <span className="font-semibold tabular-nums">
                    {walletError ? "-" : walletCoins ?? "-"}
                  </span>
                </div>
                {resolvedFreeSpinAvailable === false && freeSpinSecondsRemaining != null ? (
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-100">
                    <AlarmClock className="h-4 w-4" aria-hidden />
                    <span>Free Spin reset dalam</span>
                    <span className="font-semibold tabular-nums">
                      {formatHMS(freeSpinSecondsRemaining)}
                    </span>
                  </div>
                ) : resolvedFreeSpinAvailable === true ? (
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-100">
                    <Ticket className="h-4 w-4" aria-hidden />
                    <span className="font-semibold">Free Spin tersedia</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-6">
              {spinMode === "slot" ? (
                /* ── SLOT MACHINE MODE ── */
                <div className="relative mx-auto w-full max-w-[440px]">
                  {/* Special effect overlay */}
                  {specialEffectKey !== null && (
                    <SpecialBurstOverlay key={specialEffectKey} />
                  )}
                  {/* Reels container */}
                  <div className="flex gap-3 rounded-3xl border border-white/10 bg-zinc-950/60 p-4">
                    {!wheelSegments.length ? [0, 1, 2].map((i) => (
                      <div key={i} className="flex h-24 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900">
                        <Star className="h-6 w-6 animate-pulse text-zinc-600" aria-hidden />
                      </div>
                    )) : [0, 1, 2].map((reelIdx) => (
                      <SlotReel
                        key={reelIdx}
                        reelIdx={reelIdx}
                        segments={wheelSegments}
                        result={result}
                        isSpinning={isSpinning}
                        isSlotPaused={isSlotPaused}
                        isHighlighted={!isSpinning && !!result}
                      />
                    ))}
                  </div>

                  {/* Status label */}
                  <div className="mt-3 flex items-center justify-center">
                    <div className="rounded-full border border-white/10 bg-zinc-950/70 px-4 py-2 text-xs text-zinc-100">
                      {isSpinning ? "SPINNING..." : result ? (
                        <span className="font-semibold text-rose-300">{result.label}{result.amount != null ? ` +${result.amount}` : ""}</span>
                      ) : "READY"}
                    </div>
                  </div>
                </div>
              ) : (
              /* ── WHEEL MODE (original) ── */
              <div className="relative mx-auto w-full max-w-[440px]">
                <div className="pointer-events-none absolute left-1/2 top-[8px] z-20 h-0 w-0 -translate-x-1/2 border-x-[14px] border-t-[26px] border-x-transparent border-t-fuchsia-400 drop-shadow" />

                <div
                  className="relative aspect-square w-full"
                  onTransitionEnd={(e) => {
                    if (e.propertyName !== "transform") return;
                    if (!isSpinning) return;
                    const reward = pendingRewardRef.current;
                    if (!reward) {
                      setIsSpinning(false);
                      return;
                    }

                    const st = pendingStateRef.current;

                    spinQueueDoneRef.current += 1;

                    setResult(reward);
                    setFlashKey((k) => k + 1);

                    const next = spinQueueRef.current.shift() ?? null;
                    if (next) {
                      pendingRewardRef.current = next.reward;
                      setWheelRotation(next.targetRotation);
                      return;
                    }

                    if (st) {
                      setBalance(st.balance);
                      setUserToken(st.sharpTokens);
                      setPitySpins(st.pitySpins);
                      setPityRemaining(st.pityRemaining);
                      pendingStateRef.current = null;
                    }

                    void refreshWallet();
                    setIsSpinning(false);
                    pendingRewardRef.current = null;
                  }}
                  style={{
                    transform: `rotate(${wheelRotation}deg)`,
                    transition: isSpinning
                      ? `transform ${spinDurationMs}ms cubic-bezier(0.12, 0.95, 0.12, 1)`
                      : "transform 300ms ease",
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: wheelBg,
                    }}
                  />
                  <div className="absolute inset-2 rounded-full border border-white/10 bg-zinc-950/50" />
                  <div className="absolute inset-7 rounded-full border border-white/10 bg-zinc-950/40" />

                  <div className="absolute inset-0">
                    {wheelSegments.map((seg, i) => {
                      const a = i * segmentAngle + segmentAngle / 2;
                      return (
                        <div
                          key={`${seg.id}-${i}`}
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                          style={{
                            transform: `rotate(${a}deg) translateY(-160px) rotate(${-a}deg)`,
                          }}
                        >
                          <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/55 px-3 py-2 text-xs text-zinc-100">
                            {seg.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={seg.imageUrl}
                                alt={seg.label}
                                className="h-5 w-5 rounded-md border border-white/10 object-cover"
                              />
                            ) : seg.prizeType === "border" ? (
                              <Gift className="h-4 w-4" aria-hidden />
                            ) : isZonkPrize(seg) ? (
                              <XCircle className="h-4 w-4" aria-hidden />
                            ) : seg.prizeType === "coin" ? (
                              <Coins className="h-4 w-4" aria-hidden />
                            ) : isSharpTokenPrize(seg) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src="/img/sharp.png"
                                alt="Sharp Token"
                                className="h-4 w-4 rounded-sm"
                              />
                            ) : (
                              <Star className="h-4 w-4" aria-hidden />
                            )}
                            <span className="whitespace-nowrap">
                              {seg.amount != null ? `${seg.label} +${seg.amount}` : seg.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="rounded-full border border-white/10 bg-zinc-950/70 px-4 py-3 text-xs text-zinc-100 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
                      {isSpinning ? "SPINNING" : "READY"}
                    </div>
                  </div>
                </div>

                {result ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div
                      key={flashKey}
                      className="spin-flash absolute inset-0 rounded-full"
                    />
                    <div className="spin-result relative rounded-3xl border border-white/10 bg-zinc-950/70 px-6 py-4 text-center">
                      <div className="text-xs uppercase tracking-widest text-zinc-200/70">REWARD</div>
                      <div className="mt-1 inline-flex items-center justify-center gap-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                        {result.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={result.imageUrl}
                            alt={result.label}
                            className="h-9 w-9 rounded-xl border border-white/10 object-cover"
                          />
                        ) : result.prizeType === "border" ? (
                          <Gift className="h-7 w-7" aria-hidden />
                        ) : isZonkPrize(result) ? (
                          <XCircle className="h-7 w-7" aria-hidden />
                        ) : result.prizeType === "coin" ? (
                          <Coins className="h-7 w-7" aria-hidden />
                        ) : isSharpTokenPrize(result) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src="/img/sharp.png"
                            alt="Sharp Token"
                            className="h-7 w-7 rounded-md"
                          />
                        ) : (
                          <Star className="h-7 w-7" aria-hidden />
                        )}
                        <span>{result.label}</span>
                      </div>
                      <div className="mt-1 text-xs text-zinc-200/70">
                        {result.rarity === "epic" ? "EPIC DROP!" : ""}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
              )}

              <div className="mt-5 rounded-3xl border border-rose-400/10 bg-zinc-950/35 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Border Gotoubun no Hanayome</div>
                    <div className="mt-1 text-xs text-zinc-200/70">Progress menuju border</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-100">
                    <Star className="mr-1 inline-block h-4 w-4" aria-hidden />
                    <span className="font-semibold tabular-nums">{pitySpins ?? 0}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="h-3 overflow-hidden rounded-full border border-white/10 bg-zinc-950">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-400"
                      style={{ width: `${pityPct}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-zinc-200/70">
                    <span className="tabular-nums">{pitySpins ?? 0} / {pityTotal} Pity</span>
                    <span className="tabular-nums">{pityPct}%</span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      onClick={() => handleSpin(1)}
                      disabled={isSpinning}
                      className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-rose-500 to-pink-400 px-8 font-semibold text-zinc-950 shadow-[0_12px_35px_rgba(244,63,94,0.25)] transition hover:brightness-110 disabled:opacity-60"
                    >
                      <Ticket className="mr-2 h-4 w-4" aria-hidden />
                      {isSpinning
                        ? "SPINNING..."
                        : resolvedFreeSpinAvailable
                          ? "SPIN 1x GRATIS"
                          : "SPIN 1x"}
                    </button>

                    <button
                      onClick={() => handleSpin(10)}
                      disabled={isSpinning}
                      className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-8 font-semibold text-zinc-100 transition hover:bg-white/10 disabled:opacity-60"
                    >
                      <Ticket className="mr-2 h-4 w-4" aria-hidden />
                      {isSpinning ? "SPINNING..." : "SPIN 10x"}
                    </button>
                  </div>
                  <div className="mt-2 text-center text-xs text-zinc-200/80">
                    {resolvedFreeSpinAvailable ? (
                      <>
                        <Ticket className="mr-1 inline-block h-4 w-4" aria-hidden />
                        Free Spin tersedia (biaya 0)
                      </>
                    ) : resolvedFreeSpinAvailable === false && freeSpinSecondsRemaining != null ? (
                      <>
                        <AlarmClock className="mr-1 inline-block h-4 w-4" aria-hidden />
                        Free Spin reset dalam {formatHMS(freeSpinSecondsRemaining)}
                      </>
                    ) : (
                      <>
                        <AlarmClock className="mr-1 inline-block h-4 w-4" aria-hidden />
                        Free Spin
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 lg:col-span-5">
            <div className="text-sm text-zinc-200/80">HADIAH SPIN</div>
            <div className="mt-3 grid gap-2 text-sm text-zinc-100">
              {wheelSegments.length ? (
                <>
                  {wheelSegments.map((p, idx) => {
                    const tone =
                      p.rarity === "special"
                        ? "border-amber-400/20 bg-amber-400/5"
                        : p.rarity === "epic"
                          ? "border-fuchsia-400/25 bg-fuchsia-400/5"
                          : p.rarity === "rare"
                            ? "border-cyan-400/20 bg-cyan-400/5"
                            : p.rarity === "common"
                              ? "border-white/10 bg-zinc-950/40"
                              : "border-white/10 bg-zinc-950/25";

                    const dot =
                      p.rarity === "special"
                        ? "fill-amber-300 text-amber-300"
                        : p.rarity === "epic"
                          ? "fill-fuchsia-300 text-fuchsia-300"
                          : p.rarity === "rare"
                            ? "fill-cyan-300 text-cyan-300"
                            : p.rarity === "common"
                              ? "fill-zinc-400 text-zinc-400"
                              : "fill-zinc-500 text-zinc-500";

                    const rarityLabel =
                      p.rarity === "special"
                        ? "Special"
                        : p.rarity === "epic"
                          ? "Epic"
                          : p.rarity === "rare"
                            ? "Rare"
                            : p.rarity === "common"
                              ? "Common"
                              : "Unlucky";

                    return (
                      <div
                        key={`${p.id}-${idx}`}
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${tone}`}
                      >
                        <div className="flex items-center gap-3">
                          <Circle className={`h-3 w-3 ${dot}`} aria-hidden />
                          <span className="inline-flex items-center gap-2">
                            {p.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.imageUrl}
                                alt={p.label}
                                className="h-5 w-5 rounded-md border border-white/10 object-cover"
                              />
                            ) : p.prizeType === "border" ? (
                              <Gift className="h-4 w-4" aria-hidden />
                            ) : isZonkPrize(p) ? (
                              <XCircle className="h-4 w-4" aria-hidden />
                            ) : p.prizeType === "coin" ? (
                              <Coins className="h-4 w-4" aria-hidden />
                            ) : isSharpTokenPrize(p) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src="/img/sharp.png"
                                alt="Sharp Token"
                                className="h-4 w-4 rounded-sm"
                              />
                            ) : (
                              <Star className="h-4 w-4" aria-hidden />
                            )}
                            {p.amount != null ? `${p.label} +${p.amount}` : p.label}
                          </span>
                        </div>
                        <span className="text-zinc-200/70">{rarityLabel}</span>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-zinc-950/25 px-4 py-3 text-zinc-200/70">
                  Prize pool belum tersedia.
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="shop" className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm text-zinc-200/80">SHOP</div>
              <div className="mt-1 text-lg font-semibold">Tukarkan Sharp Token</div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/sharp.png" alt="Sharp Token" className="h-4 w-4 rounded-sm" />
              <span className="tabular-nums font-semibold">{userToken}</span>
              <span className="text-zinc-200/70">Sharp Token</span>
            </div>
          </div>

          {shopLoading ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/25 px-4 py-3 text-sm text-zinc-200/70">
              Memuat...
            </div>
          ) : shopError ? (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-zinc-100">
              Terjadi kesalahan
            </div>
          ) : shopItems.length ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {shopItems.map((item) => {
                const affordable = userToken >= item.sharp_cost;
                const isLoading = exchangeLoadingCode === item.code;

                return (
                  <div
                    key={item.code}
                    className="flex flex-col rounded-3xl border border-white/10 bg-zinc-950/25 p-4"
                  >
                    <div className="mx-auto h-20 w-20 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : item.type === "border" ? (
                        <div className="flex h-full w-full items-center justify-center">
                          <Gift className="h-7 w-7 text-zinc-100" aria-hidden />
                        </div>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Sparkles className="h-7 w-7 text-zinc-100" aria-hidden />
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex-1 text-center">
                      <div className="line-clamp-2 text-xs font-semibold leading-snug text-zinc-100">
                        {item.title}
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/img/sharp.png" alt="Sharp Token" className="h-3 w-3 rounded-sm" />
                        <span className="tabular-nums font-semibold">{item.sharp_cost}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleExchange(item.code)}
                      disabled={isLoading || !affordable}
                      className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-rose-500 to-pink-400 px-3 text-xs font-semibold text-zinc-950 transition hover:brightness-110 disabled:opacity-60"
                    >
                      {isLoading ? "..." : affordable ? "TUKAR" : "KURANG"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/25 px-4 py-3 text-sm text-zinc-200/70">
              Belum ada item
            </div>
          )}

          {exchangeError ? (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-zinc-100">
              Terjadi kesalahan
            </div>
          ) : exchangeSuccessKey > 0 ? (
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-zinc-100">
              Berhasil
            </div>
          ) : null}
        </section>

        <section id="history" className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-sm text-zinc-200/80">HISTORY SPIN TERAKHIR</div>
          <div className="mt-3 grid gap-2 text-sm text-zinc-100">
            {spinHistory.length ? (
              <div className="rounded-2xl border border-white/10 bg-zinc-950/25 p-4">
                <div className="grid gap-1 text-xs text-zinc-200/80">
                  {spinHistory.map((p, i) => (
                    <div key={`${p.id}-${i}`} className="flex items-center justify-between">
                      <span className="truncate">{i + 1}. {p.label}</span>
                      <span className="tabular-nums">
                        {p.amount != null ? `+${p.amount}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-zinc-950/25 px-4 py-3 text-sm text-zinc-200/70">
                Belum ada history
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
