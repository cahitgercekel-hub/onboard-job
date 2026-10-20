// In-memory stand-in for the Supabase client, used only in demo mode. It implements exactly the
// surface the app uses (see src/lib/db.ts) and never touches the network: tables live in
// sessionStorage, AI/storage/auth calls return a friendly "not in the demo" error, and every
// write emits the realtime postgres_changes events the stores rely on to update the UI.

import { DEMO_AI_MESSAGE, DEMO_DB_KEY, DEMO_UNAVAILABLE_MESSAGE, exitDemo } from "./demoMode";
import { buildDemoTables, DEMO_USER_EMAIL, DEMO_USER_ID, type DemoTables } from "./seed";

type Row = Record<string, unknown>;
type Result = { data: unknown; error: { message: string; code?: string } | null };
type ChangeType = "INSERT" | "UPDATE" | "DELETE";
type Filter = { col: string; op: "eq" | "neq"; value: unknown };

interface Listener {
  table: string;
  event: string;
  filter: Filter | null;
  cb: (payload: { eventType: ChangeType; new: Row; old: Row; schema: string; table: string }) => void;
}

export interface FakeSupabaseOptions {
  storage?: Pick<Storage, "getItem" | "setItem"> | null;
  onSignOut?: () => void;
  now?: () => number;
}

const unavailable = { message: DEMO_UNAVAILABLE_MESSAGE };

function sessionStore(): Pick<Storage, "getItem" | "setItem"> | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Parses realtime filters of the form "column=eq.value". */
function parseFilter(filter?: string): Filter | null {
  const m = filter?.match(/^([a-z_]+)=(eq|neq)\.(.*)$/);
  return m ? { col: m[1], op: m[2] as Filter["op"], value: m[3] } : null;
}

function matches(row: Row, f: Filter): boolean {
  const same = String(row[f.col]) === String(f.value);
  return f.op === "eq" ? same : !same;
}

function project(row: Row, columns: string): Row {
  if (columns.trim() === "*") return { ...row };
  const out: Row = {};
  for (const c of columns.split(",").map((s) => s.trim()).filter(Boolean)) out[c] = row[c] ?? null;
  return out;
}

export function createFakeSupabase(opts: FakeSupabaseOptions = {}) {
  const storage = opts.storage === undefined ? sessionStore() : opts.storage;
  const now = opts.now ?? Date.now;
  const onSignOut = opts.onSignOut ?? (() => exitDemo());
  const listeners = new Set<Listener>();

  const persist = (t: DemoTables) => {
    try {
      storage?.setItem(DEMO_DB_KEY, JSON.stringify(t));
    } catch {
      // quota or blocked storage: keep working in memory
    }
  };

  const tables: DemoTables = (() => {
    try {
      const raw = storage?.getItem(DEMO_DB_KEY);
      if (raw) return JSON.parse(raw) as DemoTables;
    } catch {
      // fall through to fresh sample data
    }
    const fresh = buildDemoTables(now());
    persist(fresh);
    return fresh;
  })();

  const emit = (table: string, eventType: ChangeType, newRow: Row | null, oldRow: Row | null) => {
    for (const l of listeners) {
      if (l.table !== table || (l.event !== "*" && l.event !== eventType)) continue;
      if (l.filter && !matches(newRow ?? oldRow ?? {}, l.filter)) continue;
      const payload = { eventType, new: newRow ? { ...newRow } : {}, old: oldRow ? { ...oldRow } : {}, schema: "public", table };
      queueMicrotask(() => l.cb(payload));
    }
  };

  class Query implements PromiseLike<Result> {
    private op: "select" | "insert" | "upsert" | "update" | "delete" = "select";
    private columns = "*";
    private returning = false;
    private values: Row[] = [];
    private patch: Row = {};
    private conflictKey = "id";
    private filters: Filter[] = [];
    private ordering: { col: string; ascending: boolean } | null = null;
    private mode: "many" | "single" | "maybeSingle" = "many";

    constructor(private table: string) {}

    select(columns = "*") {
      this.columns = columns;
      if (this.op !== "select") this.returning = true;
      return this;
    }
    insert(values: Row | Row[]) {
      this.op = "insert";
      this.values = Array.isArray(values) ? values : [values];
      return this;
    }
    upsert(values: Row | Row[], options?: { onConflict?: string }) {
      this.op = "upsert";
      this.values = Array.isArray(values) ? values : [values];
      this.conflictKey = options?.onConflict ?? "id";
      return this;
    }
    update(patch: Row) {
      this.op = "update";
      this.patch = patch;
      return this;
    }
    delete() {
      this.op = "delete";
      return this;
    }
    eq(col: string, value: unknown) {
      this.filters.push({ col, op: "eq", value });
      return this;
    }
    neq(col: string, value: unknown) {
      this.filters.push({ col, op: "neq", value });
      return this;
    }
    order(col: string, options?: { ascending?: boolean }) {
      this.ordering = { col, ascending: options?.ascending ?? true };
      return this;
    }
    single() {
      this.mode = "single";
      return this;
    }
    maybeSingle() {
      this.mode = "maybeSingle";
      return this;
    }

    then<T1 = Result, T2 = never>(
      onfulfilled?: ((value: Result) => T1 | PromiseLike<T1>) | null,
      onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
    ): PromiseLike<T1 | T2> {
      return Promise.resolve().then(() => this.run()).then(onfulfilled, onrejected);
    }

    private rows(): Row[] {
      if (!tables[this.table]) tables[this.table] = [];
      return tables[this.table];
    }

    private shape(rows: Row[]): Result {
      let out = rows;
      if (this.ordering) {
        const { col, ascending } = this.ordering;
        out = [...out].sort((a, b) => {
          const x = String(a[col] ?? ""), y = String(b[col] ?? "");
          return (x < y ? -1 : x > y ? 1 : 0) * (ascending ? 1 : -1);
        });
      }
      const data = out.map((r) => project(r, this.columns));
      if (this.mode === "many") return { data, error: null };
      if (data.length > 1 || (this.mode === "single" && data.length === 0)) {
        return { data: null, error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" } };
      }
      return { data: data[0] ?? null, error: null };
    }

    private run(): Result {
      const rows = this.rows();
      const stamp = new Date(now()).toISOString();
      const selected = () => rows.filter((r) => this.filters.every((f) => matches(r, f)));

      if (this.op === "select") return this.shape(selected());

      const changed: Row[] = [];
      if (this.op === "insert" || this.op === "upsert") {
        for (const value of this.values) {
          const existing = this.op === "upsert"
            ? rows.find((r) => value[this.conflictKey] !== undefined && r[this.conflictKey] === value[this.conflictKey])
            : undefined;
          if (existing) {
            const old = { ...existing };
            Object.assign(existing, value, { updated_at: stamp });
            changed.push(existing);
            emit(this.table, "UPDATE", existing, old);
          } else {
            const row: Row = { id: crypto.randomUUID(), user_id: DEMO_USER_ID, created_at: stamp, updated_at: stamp, ...value };
            rows.push(row);
            changed.push(row);
            emit(this.table, "INSERT", row, null);
          }
        }
      } else if (this.op === "update") {
        for (const row of selected()) {
          const old = { ...row };
          Object.assign(row, this.patch, { updated_at: stamp });
          changed.push(row);
          emit(this.table, "UPDATE", row, old);
        }
      } else if (this.op === "delete") {
        for (const row of selected()) {
          rows.splice(rows.indexOf(row), 1);
          changed.push(row);
          emit(this.table, "DELETE", null, row);
        }
      }
      persist(tables);
      return this.returning ? this.shape(changed) : { data: null, error: null };
    }
  }

  const issued = new Date(now()).toISOString();
  const user = {
    id: DEMO_USER_ID,
    email: DEMO_USER_EMAIL,
    aud: "authenticated",
    role: "authenticated",
    app_metadata: { provider: "demo", providers: ["demo"] },
    user_metadata: { display_name: "Demo user" },
    identities: [],
    created_at: issued,
    last_sign_in_at: issued,
  };
  const session = {
    access_token: "demo",
    refresh_token: "demo",
    token_type: "bearer",
    expires_in: 86_400,
    expires_at: Math.floor(now() / 1000) + 86_400,
    user,
  };
  const notInDemo = async (..._args: unknown[]) => ({ data: { user: null, session: null }, error: unavailable });

  type Channel = {
    on: (type: string, cfg: { event?: string; schema?: string; table?: string; filter?: string }, cb: Listener["cb"]) => Channel;
    subscribe: (cb?: (status: string) => void) => Channel;
    unsubscribe: () => Promise<string>;
    _listeners: Listener[];
  };

  return {
    from: (table: string) => new Query(table),
    rpc: async (..._args: unknown[]) => ({ data: null, error: unavailable }),
    auth: {
      getSession: async () => ({ data: { session }, error: null }),
      getUser: async () => ({ data: { user }, error: null }),
      onAuthStateChange: (cb: (event: string, s: typeof session) => void) => {
        queueMicrotask(() => cb("SIGNED_IN", session));
        return { data: { subscription: { unsubscribe: () => undefined } } };
      },
      signOut: async () => {
        onSignOut();
        return { error: null };
      },
      signInWithPassword: notInDemo,
      signUp: notInDemo,
      resetPasswordForEmail: notInDemo,
      updateUser: notInDemo,
      setSession: notInDemo,
    },
    functions: {
      invoke: async (..._args: unknown[]) => ({ data: null, error: { message: DEMO_AI_MESSAGE } }),
    },
    storage: {
      from: (_bucket: string) => ({
        upload: async (..._args: unknown[]) => ({ data: null, error: unavailable }),
        download: async (..._args: unknown[]) => ({ data: null, error: unavailable }),
        remove: async (..._args: unknown[]) => ({ data: [], error: null }),
        list: async (..._args: unknown[]) => ({ data: [], error: null }),
      }),
    },
    channel: (_name: string): Channel => {
      const ch: Channel = {
        _listeners: [],
        on(type, cfg, cb) {
          if (type === "postgres_changes" && cfg.table) {
            const l: Listener = { table: cfg.table, event: cfg.event ?? "*", filter: parseFilter(cfg.filter), cb };
            ch._listeners.push(l);
            listeners.add(l);
          }
          return ch;
        },
        subscribe(cb) {
          cb?.("SUBSCRIBED");
          return ch;
        },
        async unsubscribe() {
          ch._listeners.forEach((l) => listeners.delete(l));
          return "ok";
        },
      };
      return ch;
    },
    removeChannel: async (ch: { _listeners?: Listener[] }) => {
      ch?._listeners?.forEach((l) => listeners.delete(l));
      return "ok";
    },
  };
}
