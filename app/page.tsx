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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

export default function Home() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "";
  const apiVersion = process.env.NEXT_PUBLIC_API_VERSION ?? "";
  const debugLoginEnabled = process.env.NEXT_PUBLIC_DEBUG_LOGIN === "true";
  const [eventCode, setEventCode] = useState<string | null>(null);
  const [missingEventCode, setMissingEventCode] = useState(false);

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

    const slots = 8;
    const map = new Map<number, SpinReward>();
    const unassigned: SpinReward[] = [];

    for (const p of prizePool) {
      const idx = p.slotIndex;
      const valid =
        typeof idx === "number" && Number.isFinite(idx) && idx >= 0 && idx < slots;

      if (valid && !map.has(idx)) {
        map.set(idx, p);
      } else {
        unassigned.push(p);
      }
    }

    const out: SpinReward[] = [];
    for (let i = 0; i < slots; i++) {
      const hit = map.get(i);
      if (hit) {
        out.push(hit);
      } else {
        const fill = unassigned.shift();
        if (fill) {
          out.push({
            ...fill,
            slotIndex: i,
          });
          continue;
        }
        out.push({
          id: `empty-${i}`,
          label: "?",
          amount: null,
          imageUrl: null,
          prizeType: "empty",
          slotIndex: i,
          rarity: "unlucky",
        });
      }
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
  const [result, setResult] = useState<SpinReward | null>(null);
  const [flashKey, setFlashKey] = useState(0);
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
  const [apiError, setApiError] = useState(false);
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
    setApiError(false);

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
        setDebugLoginError("Terjadi kesalahan");
        setDebugLoginLoading(false);
        return;
      }

      sessionStorage.setItem("access_token", token);
      sessionStorage.setItem("refresh_token", refreshToken);
      setAuthState("allowed");
      setDebugLoginLoading(false);
    } catch {
      setDebugLoginError("Terjadi kesalahan");
      setDebugLoginLoading(false);
    }
  }

  const renderDebugLoginPanel = () => {
    return (
      <div className="mt-6 w-full rounded-3xl border border-white/10 bg-white/5 p-5 text-left">
        <div className="text-sm font-semibold text-zinc-100">Login (Debug)</div>
        <div className="mt-3 grid gap-3">
          <label className="grid gap-1 text-xs text-zinc-200/70">
            Username
            <input
              value={debugUsername}
              onChange={(e) => setDebugUsername(e.target.value)}
              className="h-11 rounded-2xl border border-white/10 bg-zinc-950/60 px-4 text-sm text-zinc-50 outline-none focus:border-cyan-400/40"
              autoComplete="username"
            />
          </label>

          <label className="grid gap-1 text-xs text-zinc-200/70">
            Password
            <input
              value={debugPassword}
              onChange={(e) => setDebugPassword(e.target.value)}
              className="h-11 rounded-2xl border border-white/10 bg-zinc-950/60 px-4 text-sm text-zinc-50 outline-none focus:border-cyan-400/40"
              type="password"
              autoComplete="current-password"
            />
          </label>

          {debugLoginError ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-zinc-100">
              {debugLoginError}
            </div>
          ) : null}

          <button
            onClick={handleDebugLogin}
            disabled={debugLoginLoading || !debugUsername || !debugPassword}
            className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-6 text-sm font-semibold text-zinc-950 transition hover:brightness-110 disabled:opacity-60"
          >
            {debugLoginLoading ? "LOGIN..." : "LOGIN"}
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
      setApiError(false);
      try {
        const res = await fetch(
          `${apiBase}/${apiVersion}/events/gacha/prizes?event_code=${encodeURIComponent(eventCode)}`,
        );
        const data = (await res.json()) as GachaPrizesResponse;
        logApi("events/gacha/prizes", data);
        if (!res.ok || !data.success) {
          setApiError(true);
          return;
        }

        const normalized = (data.prizes ?? []).map(toSpinReward);
        setPrizePool(normalized);
      } catch {
        setApiError(true);
      }
    };

    void run();
  }, [apiBase, apiVersion, eventCode, toSpinReward]);

  useEffect(() => {
    if (authState !== "allowed") return;
    if (!eventCode) return;
    if (!eventCode) return;

    const run = async () => {
      setApiError(false);

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
          setApiError(true);
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
      } catch {
        setApiError(true);
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
        setApiError(true);
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
    } catch {
      setApiError(true);
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

    const first = spinQueueRef.current.shift() ?? null;
    if (!first) {
      setIsSpinning(false);
      return;
    }

    pendingRewardRef.current = first.reward;
    setWheelRotation(first.targetRotation);
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
            {debugLoginEnabled ? renderDebugLoginPanel() : null}
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
            {debugLoginEnabled ? renderDebugLoginPanel() : null}
          </div>
        </main>
      </div>
    );
  }

  if (missingEventCode) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50">
        <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-4 py-10 text-center">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center gap-6 opacity-80">
            <div className="ketupat-swing mt-2">
              <Image
                src="/img/deco-ketupat.jpeg"
                width={84}
                height={84}
                alt="Dekorasi ketupat"
                className="h-16 w-16 rounded-2xl border border-white/10 object-cover shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
                priority
              />
            </div>
            <div className="ketupat-swing ketupat-delay-1 -mt-2">
              <Image
                src="/img/deco-ketupat.jpeg"
                width={96}
                height={96}
                alt="Dekorasi ketupat"
                className="h-20 w-20 rounded-2xl border border-white/10 object-cover shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
              />
            </div>
            <div className="ketupat-swing ketupat-delay-2 mt-3">
              <Image
                src="/img/deco-ketupat.jpeg"
                width={84}
                height={84}
                alt="Dekorasi ketupat"
                className="h-16 w-16 rounded-2xl border border-white/10 object-cover shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
              />
            </div>
          </div>

          <div className="w-full rounded-3xl border border-amber-400/20 bg-amber-500/10 p-8 shadow-[0_0_40px_rgba(245,158,11,0.10)]">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/20 bg-zinc-950/40">
              <ShieldAlert className="h-6 w-6 text-amber-200" aria-hidden />
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
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-600/25 via-zinc-950 to-amber-400/15 p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-fuchsia-500/25 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-violet-400/15 blur-3xl" />
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center gap-6 opacity-80">
            <div className="ketupat-swing mt-2">
              <Image
                src="/img/deco-ketupat.jpeg"
                width={84}
                height={84}
                alt="Dekorasi ketupat"
                className="h-16 w-16 rounded-2xl border border-white/10 object-cover shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
                priority
              />
            </div>
            <div className="ketupat-swing ketupat-delay-1 -mt-2">
              <Image
                src="/img/deco-ketupat.jpeg"
                width={96}
                height={96}
                alt="Dekorasi ketupat"
                className="h-20 w-20 rounded-2xl border border-white/10 object-cover shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
              />
            </div>
            <div className="ketupat-swing ketupat-delay-2 mt-3">
              <Image
                src="/img/deco-ketupat.jpeg"
                width={84}
                height={84}
                alt="Dekorasi ketupat"
                className="h-16 w-16 rounded-2xl border border-white/10 object-cover shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
              />
            </div>
          </div>

          <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-100">
                <Sparkles className="h-4 w-4" aria-hidden />
                <span className="font-semibold tracking-wide">RAMADAN SPIN EVENT</span>
              </div>

              <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Putar spin & kumpulkan Sharp Token
              </h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-zinc-200/80">
                Untuk mendapatkan Avatar Border eksklusif.
              </p>

              <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-200/70">
                <Gift className="mr-2 inline-block h-4 w-4" aria-hidden />
                Border Ramadan hanya tersedia di event ini dan tidak akan dijual ulang.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-100">
                  <Clock className="h-4 w-4" aria-hidden />
                  <span>{eventCountdownLabel}</span>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm text-zinc-200/80">Avatar Border</div>
                  <div className="mt-3 flex items-center gap-3">
                    {borderPrizes.slice(0, 2).map((p, idx) => (
                      <div
                        key={`${p.id}-${idx}`}
                        className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900"
                      >
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.imageUrl}
                            alt={p.label}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Gift className="m-auto h-6 w-6 text-zinc-100" aria-hidden />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm text-zinc-200/80">Reward Highlight</div>
                  <div className="mt-2 text-lg font-semibold">Border Ramadan</div>
                  <div className="mt-1 inline-flex items-center gap-2 text-sm text-zinc-200/80">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/img/sharp.png" alt="Sharp Token" className="h-4 w-4 rounded-sm" />
                    <span>75 Sharp Token</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="mx-auto h-[360px] w-full max-w-2xl sm:h-[420px]" />
            </div>
          </div>
        </section>

        <section id="spin" className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 lg:col-span-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-zinc-200/80">SPIN WHEEL</div>
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

              <div className="mt-5 rounded-3xl border border-white/10 bg-zinc-950/35 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Border Ramadan 2026</div>
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
                      className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400"
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
                      className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-8 font-semibold text-zinc-950 shadow-[0_12px_35px_rgba(34,211,238,0.18)] transition hover:brightness-110 disabled:opacity-60"
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
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shopItems.map((item) => {
                const affordable = userToken >= item.sharp_cost;
                const isLoading = exchangeLoadingCode === item.code;

                return (
                  <div
                    key={item.code}
                    className="rounded-3xl border border-white/10 bg-zinc-950/25 p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        ) : item.type === "border" ? (
                          <div className="flex h-full w-full items-center justify-center">
                            <Gift className="h-6 w-6 text-zinc-100" aria-hidden />
                          </div>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Sparkles className="h-6 w-6 text-zinc-100" aria-hidden />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-zinc-100">
                          {item.title}
                        </div>
                        <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/img/sharp.png"
                            alt="Sharp Token"
                            className="h-3.5 w-3.5 rounded-sm"
                          />
                          <span className="tabular-nums font-semibold">{item.sharp_cost}</span>
                          <span className="text-zinc-200/70">Sharp Token</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleExchange(item.code)}
                      disabled={isLoading || !affordable}
                      className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-6 text-sm font-semibold text-zinc-950 transition hover:brightness-110 disabled:opacity-60"
                    >
                      {isLoading ? "MEMPROSES..." : affordable ? "TUKAR" : "TOKEN KURANG"}
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
