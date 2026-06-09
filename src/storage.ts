import Database from 'better-sqlite3';
import { dirname, join } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { mkdirSync } from 'node:fs';

export type ContextRulePriority = 'critical' | 'high' | 'medium' | 'low';
export type ContextRuleAuthority = 'approved' | 'proposed' | 'derived';
export type ContextRuleStatus = 'draft' | 'approved' | 'deprecated';
export type ValidationStatus = 'pass' | 'fail' | 'partial' | 'unknown';
export type ValidationSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ValidationConfidence = 'high' | 'medium' | 'low';
export type KnowledgeScope = 'session' | 'user' | 'project' | 'organization';
export type KnowledgePriority = 'critical' | 'high' | 'medium' | 'low';
export type KnowledgeConfidence = 'high' | 'medium' | 'low';
export type MemoryScope = 'session' | 'user' | 'project' | 'organization';

export type KnowledgeItemInput = {
  knowledgeKey?: string;
  userId?: string;
  projectId?: number;
  sessionId?: string;
  scope: KnowledgeScope;
  category: string;
  summary: string;
  tags?: string[];
  priority?: KnowledgePriority;
  confidence?: KnowledgeConfidence;
  source?: string;
};

export type KnowledgeRelationshipInput = {
  fromKnowledgeKey: string;
  toKnowledgeKey: string;
  relationshipType: string;
  note?: string;
};

export type MemoryEntryInput = {
  memoryScope: MemoryScope;
  memoryKey: string;
  entryType: string;
  content: unknown;
  tags?: string[];
};

export type AnalysisMetadataInput = {
  runId: number;
  userId?: string;
  projectId?: number;
  sessionId?: string;
  knowledgeKeys?: string[];
  memoryKeys?: string[];
};

export type ContextRuleInput = {
  projectId: number;
  ruleId: string;
  category: string;
  statement: string;
  priority: ContextRulePriority;
  authority: ContextRuleAuthority;
  appliesTo: string[];
  validatorType: string;
  source?: string;
  status?: ContextRuleStatus;
};

export type ContextPackInput = {
  projectId: number;
  name: string;
  version: string;
  ruleIds?: number[];
  status?: 'draft' | 'active' | 'archived';
};

export type ValidationRunInput = {
  projectId: number;
  contextPackId: number;
  targetTool: string;
  taskType: 'generate' | 'review' | 'code' | 'rationale';
  outputType: 'figma' | 'screenshot' | 'html' | 'react_code' | 'web_url' | 'image';
  outputRef: string;
};

export type ValidationFindingInput = {
  ruleId: string;
  status: ValidationStatus;
  severity: ValidationSeverity;
  confidence: ValidationConfidence;
  evidence: string;
  recommendation: string;
  correctionPrompt: string;
};

export type ValidationRunSummary = {
  id: number;
  projectId: number;
  contextPackId: number;
  status: string;
  targetTool: string;
  taskType: string;
  outputType: string;
  outputRef: string;
  overallCompliance: number | null;
  createdAt: string;
  completedAt: string | null;
};

const DB_DIR =
  process.env.UX_REVIEW_DATA_DIR ??
  (process.env.VERCEL ? join(tmpdir(), 'ux-review') : join(homedir(), '.ux-review'));
const DB_PATH = join(DB_DIR, 'reviews.db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS fetch_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  figma_url TEXT NOT NULL,
  file_key TEXT,
  node_id TEXT,
  stage TEXT NOT NULL DEFAULT 'queued',
  stage_message TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  error TEXT,
  design_system_mode TEXT DEFAULT 'generic',
  design_system_findings TEXT
);

CREATE TABLE IF NOT EXISTS tool_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL REFERENCES fetch_runs(id),
  tool_name TEXT NOT NULL,
  status TEXT NOT NULL,
  raw_json TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL UNIQUE REFERENCES fetch_runs(id),
  markdown TEXT NOT NULL,
  detail_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS artifacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL REFERENCES fetch_runs(id),
  kind TEXT NOT NULL,
  path TEXT,
  source_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS analysis_metadata (
  run_id INTEGER PRIMARY KEY REFERENCES fetch_runs(id),
  user_id TEXT,
  project_id TEXT,
  session_id TEXT,
  knowledge_keys_json TEXT,
  memory_keys_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS knowledge_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_key TEXT NOT NULL UNIQUE,
  user_id TEXT,
  project_id TEXT,
  session_id TEXT,
  scope TEXT NOT NULL,
  category TEXT NOT NULL,
  summary TEXT NOT NULL,
  tags_json TEXT NOT NULL DEFAULT '[]',
  priority TEXT NOT NULL DEFAULT 'medium',
  confidence TEXT NOT NULL DEFAULT 'medium',
  source TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS knowledge_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_knowledge_key TEXT NOT NULL,
  to_knowledge_key TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS memory_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_scope TEXT NOT NULL,
  memory_key TEXT NOT NULL,
  entry_type TEXT NOT NULL,
  content_json TEXT NOT NULL,
  tags_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(memory_scope, memory_key, entry_type)
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS context_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  rule_id TEXT NOT NULL,
  category TEXT NOT NULL,
  statement TEXT NOT NULL,
  priority TEXT NOT NULL,
  authority TEXT NOT NULL,
  applies_to_json TEXT,
  validator_type TEXT NOT NULL,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, rule_id)
);

CREATE TABLE IF NOT EXISTS context_packs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT 'v1',
  status TEXT NOT NULL DEFAULT 'draft',
  rule_ids_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS validation_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  context_pack_id INTEGER NOT NULL REFERENCES context_packs(id),
  target_tool TEXT NOT NULL,
  task_type TEXT NOT NULL,
  output_type TEXT NOT NULL,
  output_ref TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  overall_compliance REAL,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS validation_findings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  validation_run_id INTEGER NOT NULL REFERENCES validation_runs(id),
  rule_id TEXT NOT NULL,
  status TEXT NOT NULL,
  severity TEXT NOT NULL,
  confidence TEXT NOT NULL,
  evidence TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  correction_prompt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS correction_prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  validation_run_id INTEGER NOT NULL REFERENCES validation_runs(id),
  target_tool TEXT NOT NULL,
  prompt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export class ReviewStorage {
  private db: Database.Database;

  private static readonly KNOWLEDGE_PRIORITY_WEIGHTS: Record<KnowledgePriority, number> = {
    critical: 60,
    high: 45,
    medium: 30,
    low: 15
  };

  private static readonly KNOWLEDGE_CONFIDENCE_WEIGHTS: Record<KnowledgeConfidence, number> = {
    high: 8,
    medium: 4,
    low: 0
  };

  private static readonly DEFAULT_SCOPE_WEIGHTS: Record<KnowledgeScope, number> = {
    session: 40,
    user: 30,
    project: 20,
    organization: 10
  };

  private generateKnowledgeKey(prefix = 'knowledge'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  }

  private ensureColumn(table: string, columnSql: string): void {
    try {
      this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnSql};`);
    } catch {
      // Column likely already exists; ignore migration no-op errors.
    }
  }

  private getScopeWeight(
    scope: KnowledgeScope,
    preferredScopes?: KnowledgeScope[]
  ): number {
    if (!preferredScopes || preferredScopes.length === 0) {
      return ReviewStorage.DEFAULT_SCOPE_WEIGHTS[scope] ?? 0;
    }

    const index = preferredScopes.indexOf(scope);
    if (index === -1) {
      return 0;
    }
    return Math.max(40 - index * 10, 10);
  }

  constructor(dbPath?: string) {
    const path = dbPath ?? DB_PATH;
    mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(SCHEMA);
    this.ensureColumn('fetch_runs', "design_system_mode TEXT DEFAULT 'generic'");
    this.ensureColumn('fetch_runs', 'design_system_findings TEXT');
  }

  createRun(inputRef: string, fileKey: string | null, nodeId: string | null): number {
    const stmt = this.db.prepare(
      'INSERT INTO fetch_runs (figma_url, file_key, node_id, stage, stage_message) VALUES (@figmaUrl, @fileKey, @nodeId, @stage, @stageMessage)'
    );
    const result = stmt.run({
      figmaUrl: inputRef,
      fileKey,
      nodeId,
      stage: 'queued',
      stageMessage: 'Review request queued'
    });
    return result.lastInsertRowid as number;
  }

  updateStage(runId: number, stage: string, stageMessage: string): void {
    this.db
      .prepare('UPDATE fetch_runs SET stage = ?, stage_message = ? WHERE id = ?')
      .run(stage, stageMessage, runId);
  }

  updateDesignSystemFindings(runId: number, mode: string, findings?: unknown): void {
    const findingsJson = findings ? JSON.stringify(findings) : null;
    this.db
      .prepare(
        'UPDATE fetch_runs SET design_system_mode = ?, design_system_findings = ? WHERE id = ?'
      )
      .run(mode, findingsJson, runId);
  }

  completeRun(runId: number): void {
    this.db
      .prepare('UPDATE fetch_runs SET status = ?, stage = ?, stage_message = ? WHERE id = ?')
      .run('completed', 'completed', 'Review completed', runId);
  }

  failRun(runId: number, error: string): void {
    this.db
      .prepare(
        'UPDATE fetch_runs SET status = ?, stage = ?, stage_message = ?, error = ? WHERE id = ?'
      )
      .run('failed', 'failed', 'Review failed', error, runId);
  }

  addToolCall(
    runId: number,
    toolName: string,
    status: string,
    data?: unknown,
    error?: string
  ): void {
    const rawJson = data ? JSON.stringify(data) : null;
    this.db
      .prepare(
        'INSERT INTO tool_calls (run_id, tool_name, status, raw_json, error) VALUES (?, ?, ?, ?, ?)'
      )
      .run(runId, toolName, status, rawJson, error ?? null);
  }

  addArtifact(runId: number, kind: string, path?: string, sourceUrl?: string): void {
    this.db
      .prepare('INSERT INTO artifacts (run_id, kind, path, source_url) VALUES (?, ?, ?, ?)')
      .run(runId, kind, path ?? null, sourceUrl ?? null);
  }

  saveAnalysisMetadata(input: AnalysisMetadataInput): void {
    this.db
      .prepare(
        `INSERT INTO analysis_metadata (
          run_id, user_id, project_id, session_id, knowledge_keys_json, memory_keys_json
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(run_id) DO UPDATE SET
          user_id = excluded.user_id,
          project_id = excluded.project_id,
          session_id = excluded.session_id,
          knowledge_keys_json = excluded.knowledge_keys_json,
          memory_keys_json = excluded.memory_keys_json,
          updated_at = datetime('now')`
      )
      .run(
        input.runId,
        input.userId ?? null,
        input.projectId !== undefined ? String(input.projectId) : null,
        input.sessionId ?? null,
        JSON.stringify(input.knowledgeKeys ?? []),
        JSON.stringify(input.memoryKeys ?? [])
      );
  }

  getAnalysisMetadata(runId: number):
    | {
        runId: number;
        userId: string | null;
        projectId: string | null;
        sessionId: string | null;
        knowledgeKeys: string[];
        memoryKeys: string[];
      }
    | undefined {
    const row = this.db
      .prepare(
        `SELECT run_id, user_id, project_id, session_id, knowledge_keys_json, memory_keys_json
         FROM analysis_metadata
         WHERE run_id = ?`
      )
      .get(runId) as
      | {
          run_id: number;
          user_id: string | null;
          project_id: string | null;
          session_id: string | null;
          knowledge_keys_json: string | null;
          memory_keys_json: string | null;
        }
      | undefined;

    if (!row) return undefined;

    return {
      runId: row.run_id,
      userId: row.user_id,
      projectId: row.project_id,
      sessionId: row.session_id,
      knowledgeKeys: row.knowledge_keys_json ? JSON.parse(row.knowledge_keys_json) : [],
      memoryKeys: row.memory_keys_json ? JSON.parse(row.memory_keys_json) : []
    };
  }

  upsertKnowledgeItem(input: KnowledgeItemInput): { id: number; knowledgeKey: string } {
    const knowledgeKey = input.knowledgeKey ?? this.generateKnowledgeKey(input.category);
    const result = this.db
      .prepare(
        `INSERT INTO knowledge_items (
          knowledge_key, user_id, project_id, session_id, scope, category, summary,
          tags_json, priority, confidence, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(knowledge_key) DO UPDATE SET
          user_id = excluded.user_id,
          project_id = excluded.project_id,
          session_id = excluded.session_id,
          scope = excluded.scope,
          category = excluded.category,
          summary = excluded.summary,
          tags_json = excluded.tags_json,
          priority = excluded.priority,
          confidence = excluded.confidence,
          source = excluded.source,
          updated_at = datetime('now')`
      )
      .run(
        knowledgeKey,
        input.userId ?? null,
        input.projectId !== undefined ? String(input.projectId) : null,
        input.sessionId ?? null,
        input.scope,
        input.category,
        input.summary,
        JSON.stringify(input.tags ?? []),
        input.priority ?? 'medium',
        input.confidence ?? 'medium',
        input.source ?? null
      );

    return { id: Number(result.lastInsertRowid || 0), knowledgeKey };
  }

  upsertKnowledgeItems(inputs: KnowledgeItemInput[]): Array<{ id: number; knowledgeKey: string }> {
    return inputs.map(input => this.upsertKnowledgeItem(input));
  }

  listKnowledgeItems(filters: {
    userId?: string;
    projectId?: number;
    sessionId?: string;
    scope?: KnowledgeScope;
    category?: string;
    knowledgeKeys?: string[];
    tags?: string[];
    queryTags?: string[];
    preferredScopes?: KnowledgeScope[];
    boostKnowledgeKeys?: string[];
    ranked?: boolean;
    limit?: number;
  } = {}): Array<{
    id: number;
    knowledgeKey: string;
    userId: string | null;
    projectId: string | null;
    sessionId: string | null;
    scope: KnowledgeScope;
    category: string;
    summary: string;
    tags: string[];
    priority: KnowledgePriority;
    confidence: KnowledgeConfidence;
    source: string | null;
    retrievalScore?: number;
    createdAt: string;
    updatedAt: string;
  }> {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (filters.userId) {
      clauses.push('user_id = ?');
      params.push(filters.userId);
    }
    if (filters.projectId !== undefined) {
      clauses.push('project_id = ?');
      params.push(String(filters.projectId));
    }
    if (filters.sessionId) {
      clauses.push('session_id = ?');
      params.push(filters.sessionId);
    }
    if (filters.scope) {
      clauses.push('scope = ?');
      params.push(filters.scope);
    }
    if (filters.category) {
      clauses.push('category = ?');
      params.push(filters.category);
    }
    if (filters.knowledgeKeys && filters.knowledgeKeys.length > 0) {
      clauses.push(`knowledge_key IN (${filters.knowledgeKeys.map(() => '?').join(', ')})`);
      params.push(...filters.knowledgeKeys);
    }

    const requestedLimit = filters.limit ?? 50;
    const queryLimit = filters.ranked
      ? Math.max(requestedLimit * 3, 150)
      : requestedLimit;
    params.push(queryLimit);

    const rows = this.db
      .prepare(
        `SELECT id, knowledge_key, user_id, project_id, session_id, scope, category, summary,
                tags_json, priority, confidence, source, created_at, updated_at
         FROM knowledge_items
         ${clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''}
         ORDER BY updated_at DESC, id DESC
         LIMIT ?`
      )
      .all(...params) as Array<{
      id: number;
      knowledge_key: string;
      user_id: string | null;
      project_id: string | null;
      session_id: string | null;
      scope: KnowledgeScope;
      category: string;
      summary: string;
      tags_json: string | null;
      priority: KnowledgePriority;
      confidence: KnowledgeConfidence;
      source: string | null;
      created_at: string;
      updated_at: string;
    }>;

    const normalizedRows = rows.map(row => ({
      id: row.id,
      knowledgeKey: row.knowledge_key,
      userId: row.user_id,
      projectId: row.project_id,
      sessionId: row.session_id,
      scope: row.scope,
      category: row.category,
      summary: row.summary,
      priority: row.priority,
      confidence: row.confidence,
      source: row.source,
      tags: row.tags_json ? (JSON.parse(row.tags_json) as string[]) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    const tagFilterSet = new Set((filters.tags ?? []).map(tag => tag.toLowerCase()));
    const withTagFilter = tagFilterSet.size > 0
      ? normalizedRows.filter(item =>
          item.tags.some((tag: string) => tagFilterSet.has(tag.toLowerCase()))
        )
      : normalizedRows;

    if (!filters.ranked) {
      return withTagFilter.slice(0, requestedLimit);
    }

    const queryTagSet = new Set((filters.queryTags ?? []).map(tag => tag.toLowerCase()));
    const boostedKeys = new Set(filters.boostKnowledgeKeys ?? []);
    const preferredScopes = filters.preferredScopes;

    const rankedItems = withTagFilter
      .map(item => {
        const priorityWeight = ReviewStorage.KNOWLEDGE_PRIORITY_WEIGHTS[item.priority] ?? 0;
        const confidenceWeight = ReviewStorage.KNOWLEDGE_CONFIDENCE_WEIGHTS[item.confidence] ?? 0;
        const scopeWeight = this.getScopeWeight(item.scope, preferredScopes);
        const tagMatches = item.tags.reduce(
          (acc: number, tag: string) => acc + (queryTagSet.has(tag.toLowerCase()) ? 1 : 0),
          0
        );
        const tagWeight = Math.min(tagMatches, 3) * 12;
        const boostWeight = boostedKeys.has(item.knowledgeKey) ? 25 : 0;
        const retrievalScore = priorityWeight + confidenceWeight + scopeWeight + tagWeight + boostWeight;

        return {
          ...item,
          retrievalScore
        };
      })
      .sort((a, b) => {
        if ((b.retrievalScore ?? 0) !== (a.retrievalScore ?? 0)) {
          return (b.retrievalScore ?? 0) - (a.retrievalScore ?? 0);
        }
        return b.id - a.id;
      });

    return rankedItems.slice(0, requestedLimit);
  }

  addKnowledgeRelationships(inputs: KnowledgeRelationshipInput[]): number {
    const stmt = this.db.prepare(
      `INSERT INTO knowledge_relationships (
         from_knowledge_key, to_knowledge_key, relationship_type, note
       ) VALUES (?, ?, ?, ?)`
    );

    const insertMany = this.db.transaction((rows: KnowledgeRelationshipInput[]) => {
      for (const row of rows) {
        stmt.run(row.fromKnowledgeKey, row.toKnowledgeKey, row.relationshipType, row.note ?? null);
      }
    });

    insertMany(inputs);
    return inputs.length;
  }

  listKnowledgeRelationships(filters: {
    knowledgeKeys?: string[];
    limit?: number;
  } = {}): Array<{
    id: number;
    fromKnowledgeKey: string;
    toKnowledgeKey: string;
    relationshipType: string;
    note: string | null;
    createdAt: string;
  }> {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (filters.knowledgeKeys && filters.knowledgeKeys.length > 0) {
      clauses.push(
        `(from_knowledge_key IN (${filters.knowledgeKeys.map(() => '?').join(', ')}) OR to_knowledge_key IN (${filters.knowledgeKeys.map(() => '?').join(', ')}))`
      );
      params.push(...filters.knowledgeKeys, ...filters.knowledgeKeys);
    }

    const limit = filters.limit ?? 50;
    params.push(limit);

    const rows = this.db
      .prepare(
        `SELECT id, from_knowledge_key, to_knowledge_key, relationship_type, note, created_at
         FROM knowledge_relationships
         ${clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''}
         ORDER BY id DESC
         LIMIT ?`
      )
      .all(...params) as Array<{
      id: number;
      from_knowledge_key: string;
      to_knowledge_key: string;
      relationship_type: string;
      note: string | null;
      created_at: string;
    }>;

    return rows.map(row => ({
      id: row.id,
      fromKnowledgeKey: row.from_knowledge_key,
      toKnowledgeKey: row.to_knowledge_key,
      relationshipType: row.relationship_type,
      note: row.note,
      createdAt: row.created_at
    }));
  }

  upsertMemoryEntry(input: MemoryEntryInput): { id: number } {
    const result = this.db
      .prepare(
        `INSERT INTO memory_entries (
          memory_scope, memory_key, entry_type, content_json, tags_json
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(memory_scope, memory_key, entry_type) DO UPDATE SET
          content_json = excluded.content_json,
          tags_json = excluded.tags_json,
          updated_at = datetime('now')`
      )
      .run(
        input.memoryScope,
        input.memoryKey,
        input.entryType,
        JSON.stringify(input.content),
        JSON.stringify(input.tags ?? [])
      );

    return { id: Number(result.lastInsertRowid || 0) };
  }

  upsertMemoryEntries(inputs: MemoryEntryInput[]): Array<{ id: number }> {
    return inputs.map(input => this.upsertMemoryEntry(input));
  }

  listMemoryEntries(filters: {
    memoryScope?: MemoryScope;
    memoryKey?: string;
    entryType?: string;
    memoryKeys?: string[];
    limit?: number;
  } = {}): Array<{
    id: number;
    memoryScope: MemoryScope;
    memoryKey: string;
    entryType: string;
    content: unknown;
    tags: string[];
    createdAt: string;
    updatedAt: string;
  }> {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (filters.memoryScope) {
      clauses.push('memory_scope = ?');
      params.push(filters.memoryScope);
    }
    if (filters.memoryKey) {
      clauses.push('memory_key = ?');
      params.push(filters.memoryKey);
    }
    if (filters.entryType) {
      clauses.push('entry_type = ?');
      params.push(filters.entryType);
    }
    if (filters.memoryKeys && filters.memoryKeys.length > 0) {
      clauses.push(`(memory_scope || ':' || memory_key || ':' || entry_type) IN (${filters.memoryKeys.map(() => '?').join(', ')})`);
      params.push(...filters.memoryKeys);
    }

    const limit = filters.limit ?? 50;
    params.push(limit);

    const rows = this.db
      .prepare(
        `SELECT id, memory_scope, memory_key, entry_type, content_json, tags_json, created_at, updated_at
         FROM memory_entries
         ${clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''}
         ORDER BY updated_at DESC, id DESC
         LIMIT ?`
      )
      .all(...params) as Array<{
      id: number;
      memory_scope: MemoryScope;
      memory_key: string;
      entry_type: string;
      content_json: string;
      tags_json: string | null;
      created_at: string;
      updated_at: string;
    }>;

    return rows.map(row => ({
      id: row.id,
      memoryScope: row.memory_scope,
      memoryKey: row.memory_key,
      entryType: row.entry_type,
      content: JSON.parse(row.content_json),
      tags: row.tags_json ? JSON.parse(row.tags_json) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  getKnowledgeContextForRun(runId: number):
    | {
        metadata: {
          runId: number;
          userId: string | null;
          projectId: string | null;
          sessionId: string | null;
          knowledgeKeys: string[];
          memoryKeys: string[];
        };
        knowledgeItems: ReturnType<ReviewStorage['listKnowledgeItems']>;
        relationships: ReturnType<ReviewStorage['listKnowledgeRelationships']>;
        memoryEntries: ReturnType<ReviewStorage['listMemoryEntries']>;
      }
    | undefined {
    const metadata = this.getAnalysisMetadata(runId);
    if (!metadata) {
      return undefined;
    }

    const seededKnowledgeItems = this.listKnowledgeItems({
      knowledgeKeys: metadata.knowledgeKeys,
      limit: 100
    });

    const candidateGroups = [
      metadata.sessionId
        ? this.listKnowledgeItems({ sessionId: metadata.sessionId, limit: 100 })
        : [],
      metadata.projectId
        ? this.listKnowledgeItems({ projectId: Number(metadata.projectId), limit: 100 })
        : [],
      metadata.userId
        ? this.listKnowledgeItems({ userId: metadata.userId, limit: 100 })
        : [],
      this.listKnowledgeItems({ scope: 'organization', limit: 100 }),
      seededKnowledgeItems
    ];

    const candidateMap = new Map<string, ReturnType<ReviewStorage['listKnowledgeItems']>[number]>();
    for (const group of candidateGroups) {
      for (const item of group) {
        if (!candidateMap.has(item.knowledgeKey)) {
          candidateMap.set(item.knowledgeKey, item);
        }
      }
    }
    const candidateKnowledgeKeys = Array.from(candidateMap.keys());

    const queryTags = Array.from(
      new Set(seededKnowledgeItems.flatMap(item => item.tags.map(tag => tag.toLowerCase())))
    ).slice(0, 30);

    const preferredScopes: KnowledgeScope[] = metadata.sessionId
      ? ['session', 'project', 'user', 'organization']
      : metadata.projectId
        ? ['project', 'user', 'organization', 'session']
        : metadata.userId
          ? ['user', 'organization', 'project', 'session']
          : ['organization', 'project', 'user', 'session'];

    const rankedKnowledgeItems = this.listKnowledgeItems({
      knowledgeKeys: candidateKnowledgeKeys,
      limit: 50,
      ranked: true,
      queryTags,
      preferredScopes,
      boostKnowledgeKeys: metadata.knowledgeKeys
    });

    const selectedKnowledgeItems =
      rankedKnowledgeItems.length > 0 ? rankedKnowledgeItems : seededKnowledgeItems.slice(0, 50);

    return {
      metadata,
      knowledgeItems: selectedKnowledgeItems,
      relationships: this.listKnowledgeRelationships({
        knowledgeKeys: selectedKnowledgeItems.map(item => item.knowledgeKey),
        limit: 50
      }),
      memoryEntries: this.listMemoryEntries({ limit: 50, memoryKeys: metadata.memoryKeys })
    };
  }

  saveReport(runId: number, markdown: string, detail?: unknown): void {
    const detailJson = detail ? JSON.stringify(detail) : null;
    this.db
      .prepare('INSERT OR REPLACE INTO reports (run_id, markdown, detail_json) VALUES (?, ?, ?)')
      .run(runId, markdown, detailJson);
  }

  getReport(runId: number): string | undefined {
    const row = this.db.prepare('SELECT markdown FROM reports WHERE run_id = ?').get(runId) as
      | { markdown: string }
      | undefined;
    return row?.markdown;
  }

  getReportDetail(runId: number): unknown | undefined {
    const row = this.db.prepare('SELECT detail_json FROM reports WHERE run_id = ?').get(runId) as
      | { detail_json: string | null }
      | undefined;

    if (!row?.detail_json) {
      return undefined;
    }

    try {
      return JSON.parse(row.detail_json);
    } catch {
      return undefined;
    }
  }

  getRun(runId: number) {
    return this.db.prepare('SELECT * FROM fetch_runs WHERE id = ?').get(runId);
  }

  listRuns(limit = 20) {
    return this.db
      .prepare(
        'SELECT id, created_at, figma_url, status, stage, stage_message, error, design_system_mode FROM fetch_runs ORDER BY id DESC LIMIT ?'
      )
      .all(limit);
  }

  getDesignSystemFindings(runId: number): unknown | undefined {
    const row = this.db
      .prepare('SELECT design_system_mode, design_system_findings FROM fetch_runs WHERE id = ?')
      .get(runId) as
      | { design_system_mode?: string; design_system_findings?: string | null }
      | undefined;

    if (!row?.design_system_findings) {
      return undefined;
    }

    try {
      return {
        mode: row.design_system_mode ?? 'generic',
        ...JSON.parse(row.design_system_findings)
      };
    } catch {
      return undefined;
    }
  }

  getToolCalls(runId: number): Array<{ tool_name: string; status: string; raw_json: string | null; error: string | null }> {
    return this.db
      .prepare('SELECT tool_name, status, raw_json, error FROM tool_calls WHERE run_id = ? ORDER BY id ASC')
      .all(runId) as Array<{ tool_name: string; status: string; raw_json: string | null; error: string | null }>;
  }

  createProject(name: string, description?: string): { id: number; name: string; description: string | null } {
    const result = this.db
      .prepare('INSERT INTO projects (name, description) VALUES (?, ?)')
      .run(name, description ?? null);
    return {
      id: result.lastInsertRowid as number,
      name,
      description: description ?? null
    };
  }

  listProjects(): Array<{ id: number; name: string; description: string | null; created_at: string }> {
    return this.db
      .prepare('SELECT id, name, description, created_at FROM projects ORDER BY id DESC')
      .all() as Array<{ id: number; name: string; description: string | null; created_at: string }>;
  }

  addContextRule(input: ContextRuleInput): {
    id: number;
    projectId: number;
    ruleId: string;
    status: ContextRuleStatus;
  } {
    const status = input.status ?? 'draft';
    const result = this.db
      .prepare(
        `INSERT INTO context_rules (
          project_id, rule_id, category, statement, priority, authority, applies_to_json,
          validator_type, source, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.projectId,
        input.ruleId,
        input.category,
        input.statement,
        input.priority,
        input.authority,
        JSON.stringify(input.appliesTo ?? []),
        input.validatorType,
        input.source ?? null,
        status
      );

    return {
      id: result.lastInsertRowid as number,
      projectId: input.projectId,
      ruleId: input.ruleId,
      status
    };
  }

  listContextRules(
    projectId: number,
    status?: ContextRuleStatus
  ): Array<{
    id: number;
    projectId: number;
    ruleId: string;
    category: string;
    statement: string;
    priority: ContextRulePriority;
    authority: ContextRuleAuthority;
    appliesTo: string[];
    validatorType: string;
    source: string | null;
    status: ContextRuleStatus;
  }> {
    const rows = (status
      ? this.db
          .prepare(
            `SELECT id, project_id, rule_id, category, statement, priority, authority,
                    applies_to_json, validator_type, source, status
             FROM context_rules
             WHERE project_id = ? AND status = ?
             ORDER BY id ASC`
          )
          .all(projectId, status)
      : this.db
          .prepare(
            `SELECT id, project_id, rule_id, category, statement, priority, authority,
                    applies_to_json, validator_type, source, status
             FROM context_rules
             WHERE project_id = ?
             ORDER BY id ASC`
          )
          .all(projectId)) as Array<{
      id: number;
      project_id: number;
      rule_id: string;
      category: string;
      statement: string;
      priority: ContextRulePriority;
      authority: ContextRuleAuthority;
      applies_to_json: string | null;
      validator_type: string;
      source: string | null;
      status: ContextRuleStatus;
    }>;

    return rows.map(row => ({
      id: row.id,
      projectId: row.project_id,
      ruleId: row.rule_id,
      category: row.category,
      statement: row.statement,
      priority: row.priority,
      authority: row.authority,
      appliesTo: row.applies_to_json ? JSON.parse(row.applies_to_json) : [],
      validatorType: row.validator_type,
      source: row.source,
      status: row.status
    }));
  }

  approveContextRule(rulePkId: number): void {
    this.db
      .prepare("UPDATE context_rules SET status = 'approved', updated_at = datetime('now') WHERE id = ?")
      .run(rulePkId);
  }

  createContextPack(input: ContextPackInput): {
    id: number;
    projectId: number;
    name: string;
    version: string;
    ruleIds: number[];
    status: 'draft' | 'active' | 'archived';
  } {
    const status = input.status ?? 'draft';
    const version = input.version || 'v1';
    const ruleIds = input.ruleIds ?? [];
    const result = this.db
      .prepare(
        'INSERT INTO context_packs (project_id, name, version, status, rule_ids_json) VALUES (?, ?, ?, ?, ?)'
      )
      .run(input.projectId, input.name, version, status, JSON.stringify(ruleIds));

    return {
      id: result.lastInsertRowid as number,
      projectId: input.projectId,
      name: input.name,
      version,
      ruleIds,
      status
    };
  }

  getContextPack(packId: number):
    | {
        id: number;
        projectId: number;
        name: string;
        version: string;
        status: 'draft' | 'active' | 'archived';
        ruleIds: number[];
      }
    | undefined {
    const row = this.db
      .prepare('SELECT id, project_id, name, version, status, rule_ids_json FROM context_packs WHERE id = ?')
      .get(packId) as
      | {
          id: number;
          project_id: number;
          name: string;
          version: string;
          status: 'draft' | 'active' | 'archived';
          rule_ids_json: string | null;
        }
      | undefined;

    if (!row) {
      return undefined;
    }

    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      version: row.version,
      status: row.status,
      ruleIds: row.rule_ids_json ? JSON.parse(row.rule_ids_json) : []
    };
  }

  createValidationRun(input: ValidationRunInput): { id: number } {
    const result = this.db
      .prepare(
        `INSERT INTO validation_runs (
          project_id, context_pack_id, target_tool, task_type, output_type, output_ref
        ) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.projectId,
        input.contextPackId,
        input.targetTool,
        input.taskType,
        input.outputType,
        input.outputRef
      );

    return { id: result.lastInsertRowid as number };
  }

  completeValidationRun(runId: number, overallCompliance: number): void {
    this.db
      .prepare(
        "UPDATE validation_runs SET status = 'completed', overall_compliance = ?, completed_at = datetime('now') WHERE id = ?"
      )
      .run(overallCompliance, runId);
  }

  failValidationRun(runId: number, error: string): void {
    this.db
      .prepare(
        "UPDATE validation_runs SET status = 'failed', error = ?, completed_at = datetime('now') WHERE id = ?"
      )
      .run(error, runId);
  }

  saveValidationFindings(runId: number, findings: ValidationFindingInput[]): void {
    const stmt = this.db.prepare(
      `INSERT INTO validation_findings (
         validation_run_id, rule_id, status, severity, confidence,
         evidence, recommendation, correction_prompt
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const insertMany = this.db.transaction((rows: ValidationFindingInput[]) => {
      for (const finding of rows) {
        stmt.run(
          runId,
          finding.ruleId,
          finding.status,
          finding.severity,
          finding.confidence,
          finding.evidence,
          finding.recommendation,
          finding.correctionPrompt
        );
      }
    });

    insertMany(findings);
  }

  getValidationFindings(
    runId: number
  ): Array<{
    ruleId: string;
    status: ValidationStatus;
    severity: ValidationSeverity;
    confidence: ValidationConfidence;
    evidence: string;
    recommendation: string;
    correctionPrompt: string;
  }> {
    const rows = this.db
      .prepare(
        `SELECT rule_id, status, severity, confidence, evidence, recommendation, correction_prompt
         FROM validation_findings
         WHERE validation_run_id = ?
         ORDER BY id ASC`
      )
      .all(runId) as Array<{
      rule_id: string;
      status: ValidationStatus;
      severity: ValidationSeverity;
      confidence: ValidationConfidence;
      evidence: string;
      recommendation: string;
      correction_prompt: string;
    }>;

    return rows.map(row => ({
      ruleId: row.rule_id,
      status: row.status,
      severity: row.severity,
      confidence: row.confidence,
      evidence: row.evidence,
      recommendation: row.recommendation,
      correctionPrompt: row.correction_prompt
    }));
  }

  saveCorrectionPrompt(runId: number, targetTool: string, prompt: string): void {
    this.db
      .prepare('INSERT INTO correction_prompts (validation_run_id, target_tool, prompt) VALUES (?, ?, ?)')
      .run(runId, targetTool, prompt);
  }

  getCorrectionPrompts(
    runId: number
  ): Array<{ id: number; targetTool: string; prompt: string; createdAt: string }> {
    const rows = this.db
      .prepare(
        `SELECT id, target_tool, prompt, created_at
         FROM correction_prompts
         WHERE validation_run_id = ?
         ORDER BY id ASC`
      )
      .all(runId) as Array<{
      id: number;
      target_tool: string;
      prompt: string;
      created_at: string;
    }>;

    return rows.map(row => ({
      id: row.id,
      targetTool: row.target_tool,
      prompt: row.prompt,
      createdAt: row.created_at
    }));
  }

  getValidationRunSummary(runId: number): ValidationRunSummary | undefined {
    const row = this.db
      .prepare(
        `SELECT id, project_id, context_pack_id, status, target_tool, task_type,
                output_type, output_ref, overall_compliance, created_at, completed_at
         FROM validation_runs
         WHERE id = ?`
      )
      .get(runId) as
      | {
          id: number;
          project_id: number;
          context_pack_id: number;
          status: string;
          target_tool: string;
          task_type: string;
          output_type: string;
          output_ref: string;
          overall_compliance: number | null;
          created_at: string;
          completed_at: string | null;
        }
      | undefined;

    if (!row) {
      return undefined;
    }

    return {
      id: row.id,
      projectId: row.project_id,
      contextPackId: row.context_pack_id,
      status: row.status,
      targetTool: row.target_tool,
      taskType: row.task_type,
      outputType: row.output_type,
      outputRef: row.output_ref,
      overallCompliance: row.overall_compliance,
      createdAt: row.created_at,
      completedAt: row.completed_at
    };
  }
}
