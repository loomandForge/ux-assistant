import Database from 'better-sqlite3';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { mkdirSync } from 'node:fs';
const DB_DIR = process.env.UX_REVIEW_DATA_DIR ?? join(homedir(), '.ux-review');
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
    db;
    static KNOWLEDGE_PRIORITY_WEIGHTS = {
        critical: 60,
        high: 45,
        medium: 30,
        low: 15
    };
    static KNOWLEDGE_CONFIDENCE_WEIGHTS = {
        high: 8,
        medium: 4,
        low: 0
    };
    static DEFAULT_SCOPE_WEIGHTS = {
        session: 40,
        user: 30,
        project: 20,
        organization: 10
    };
    generateKnowledgeKey(prefix = 'knowledge') {
        return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
    }
    ensureColumn(table, columnSql) {
        try {
            this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnSql};`);
        }
        catch {
            // Column likely already exists; ignore migration no-op errors.
        }
    }
    getScopeWeight(scope, preferredScopes) {
        if (!preferredScopes || preferredScopes.length === 0) {
            return ReviewStorage.DEFAULT_SCOPE_WEIGHTS[scope] ?? 0;
        }
        const index = preferredScopes.indexOf(scope);
        if (index === -1) {
            return 0;
        }
        return Math.max(40 - index * 10, 10);
    }
    constructor(dbPath) {
        const path = dbPath ?? DB_PATH;
        mkdirSync(DB_DIR, { recursive: true });
        this.db = new Database(path);
        this.db.pragma('journal_mode = WAL');
        this.db.exec(SCHEMA);
        this.ensureColumn('fetch_runs', "design_system_mode TEXT DEFAULT 'generic'");
        this.ensureColumn('fetch_runs', 'design_system_findings TEXT');
    }
    createRun(inputRef, fileKey, nodeId) {
        const stmt = this.db.prepare('INSERT INTO fetch_runs (figma_url, file_key, node_id, stage, stage_message) VALUES (@figmaUrl, @fileKey, @nodeId, @stage, @stageMessage)');
        const result = stmt.run({
            figmaUrl: inputRef,
            fileKey,
            nodeId,
            stage: 'queued',
            stageMessage: 'Review request queued'
        });
        return result.lastInsertRowid;
    }
    updateStage(runId, stage, stageMessage) {
        this.db
            .prepare('UPDATE fetch_runs SET stage = ?, stage_message = ? WHERE id = ?')
            .run(stage, stageMessage, runId);
    }
    updateDesignSystemFindings(runId, mode, findings) {
        const findingsJson = findings ? JSON.stringify(findings) : null;
        this.db
            .prepare('UPDATE fetch_runs SET design_system_mode = ?, design_system_findings = ? WHERE id = ?')
            .run(mode, findingsJson, runId);
    }
    completeRun(runId) {
        this.db
            .prepare('UPDATE fetch_runs SET status = ?, stage = ?, stage_message = ? WHERE id = ?')
            .run('completed', 'completed', 'Review completed', runId);
    }
    failRun(runId, error) {
        this.db
            .prepare('UPDATE fetch_runs SET status = ?, stage = ?, stage_message = ?, error = ? WHERE id = ?')
            .run('failed', 'failed', 'Review failed', error, runId);
    }
    addToolCall(runId, toolName, status, data, error) {
        const rawJson = data ? JSON.stringify(data) : null;
        this.db
            .prepare('INSERT INTO tool_calls (run_id, tool_name, status, raw_json, error) VALUES (?, ?, ?, ?, ?)')
            .run(runId, toolName, status, rawJson, error ?? null);
    }
    addArtifact(runId, kind, path, sourceUrl) {
        this.db
            .prepare('INSERT INTO artifacts (run_id, kind, path, source_url) VALUES (?, ?, ?, ?)')
            .run(runId, kind, path ?? null, sourceUrl ?? null);
    }
    saveAnalysisMetadata(input) {
        this.db
            .prepare(`INSERT INTO analysis_metadata (
          run_id, user_id, project_id, session_id, knowledge_keys_json, memory_keys_json
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(run_id) DO UPDATE SET
          user_id = excluded.user_id,
          project_id = excluded.project_id,
          session_id = excluded.session_id,
          knowledge_keys_json = excluded.knowledge_keys_json,
          memory_keys_json = excluded.memory_keys_json,
          updated_at = datetime('now')`)
            .run(input.runId, input.userId ?? null, input.projectId !== undefined ? String(input.projectId) : null, input.sessionId ?? null, JSON.stringify(input.knowledgeKeys ?? []), JSON.stringify(input.memoryKeys ?? []));
    }
    getAnalysisMetadata(runId) {
        const row = this.db
            .prepare(`SELECT run_id, user_id, project_id, session_id, knowledge_keys_json, memory_keys_json
         FROM analysis_metadata
         WHERE run_id = ?`)
            .get(runId);
        if (!row)
            return undefined;
        return {
            runId: row.run_id,
            userId: row.user_id,
            projectId: row.project_id,
            sessionId: row.session_id,
            knowledgeKeys: row.knowledge_keys_json ? JSON.parse(row.knowledge_keys_json) : [],
            memoryKeys: row.memory_keys_json ? JSON.parse(row.memory_keys_json) : []
        };
    }
    upsertKnowledgeItem(input) {
        const knowledgeKey = input.knowledgeKey ?? this.generateKnowledgeKey(input.category);
        const result = this.db
            .prepare(`INSERT INTO knowledge_items (
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
          updated_at = datetime('now')`)
            .run(knowledgeKey, input.userId ?? null, input.projectId !== undefined ? String(input.projectId) : null, input.sessionId ?? null, input.scope, input.category, input.summary, JSON.stringify(input.tags ?? []), input.priority ?? 'medium', input.confidence ?? 'medium', input.source ?? null);
        return { id: Number(result.lastInsertRowid || 0), knowledgeKey };
    }
    upsertKnowledgeItems(inputs) {
        return inputs.map(input => this.upsertKnowledgeItem(input));
    }
    listKnowledgeItems(filters = {}) {
        const clauses = [];
        const params = [];
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
            .prepare(`SELECT id, knowledge_key, user_id, project_id, session_id, scope, category, summary,
                tags_json, priority, confidence, source, created_at, updated_at
         FROM knowledge_items
         ${clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''}
         ORDER BY updated_at DESC, id DESC
         LIMIT ?`)
            .all(...params);
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
            tags: row.tags_json ? JSON.parse(row.tags_json) : [],
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
        const tagFilterSet = new Set((filters.tags ?? []).map(tag => tag.toLowerCase()));
        const withTagFilter = tagFilterSet.size > 0
            ? normalizedRows.filter(item => item.tags.some((tag) => tagFilterSet.has(tag.toLowerCase())))
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
            const tagMatches = item.tags.reduce((acc, tag) => acc + (queryTagSet.has(tag.toLowerCase()) ? 1 : 0), 0);
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
    addKnowledgeRelationships(inputs) {
        const stmt = this.db.prepare(`INSERT INTO knowledge_relationships (
         from_knowledge_key, to_knowledge_key, relationship_type, note
       ) VALUES (?, ?, ?, ?)`);
        const insertMany = this.db.transaction((rows) => {
            for (const row of rows) {
                stmt.run(row.fromKnowledgeKey, row.toKnowledgeKey, row.relationshipType, row.note ?? null);
            }
        });
        insertMany(inputs);
        return inputs.length;
    }
    listKnowledgeRelationships(filters = {}) {
        const clauses = [];
        const params = [];
        if (filters.knowledgeKeys && filters.knowledgeKeys.length > 0) {
            clauses.push(`(from_knowledge_key IN (${filters.knowledgeKeys.map(() => '?').join(', ')}) OR to_knowledge_key IN (${filters.knowledgeKeys.map(() => '?').join(', ')}))`);
            params.push(...filters.knowledgeKeys, ...filters.knowledgeKeys);
        }
        const limit = filters.limit ?? 50;
        params.push(limit);
        const rows = this.db
            .prepare(`SELECT id, from_knowledge_key, to_knowledge_key, relationship_type, note, created_at
         FROM knowledge_relationships
         ${clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''}
         ORDER BY id DESC
         LIMIT ?`)
            .all(...params);
        return rows.map(row => ({
            id: row.id,
            fromKnowledgeKey: row.from_knowledge_key,
            toKnowledgeKey: row.to_knowledge_key,
            relationshipType: row.relationship_type,
            note: row.note,
            createdAt: row.created_at
        }));
    }
    upsertMemoryEntry(input) {
        const result = this.db
            .prepare(`INSERT INTO memory_entries (
          memory_scope, memory_key, entry_type, content_json, tags_json
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(memory_scope, memory_key, entry_type) DO UPDATE SET
          content_json = excluded.content_json,
          tags_json = excluded.tags_json,
          updated_at = datetime('now')`)
            .run(input.memoryScope, input.memoryKey, input.entryType, JSON.stringify(input.content), JSON.stringify(input.tags ?? []));
        return { id: Number(result.lastInsertRowid || 0) };
    }
    upsertMemoryEntries(inputs) {
        return inputs.map(input => this.upsertMemoryEntry(input));
    }
    listMemoryEntries(filters = {}) {
        const clauses = [];
        const params = [];
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
            .prepare(`SELECT id, memory_scope, memory_key, entry_type, content_json, tags_json, created_at, updated_at
         FROM memory_entries
         ${clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''}
         ORDER BY updated_at DESC, id DESC
         LIMIT ?`)
            .all(...params);
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
    getKnowledgeContextForRun(runId) {
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
        const candidateMap = new Map();
        for (const group of candidateGroups) {
            for (const item of group) {
                if (!candidateMap.has(item.knowledgeKey)) {
                    candidateMap.set(item.knowledgeKey, item);
                }
            }
        }
        const candidateKnowledgeKeys = Array.from(candidateMap.keys());
        const queryTags = Array.from(new Set(seededKnowledgeItems.flatMap(item => item.tags.map(tag => tag.toLowerCase())))).slice(0, 30);
        const preferredScopes = metadata.sessionId
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
        const selectedKnowledgeItems = rankedKnowledgeItems.length > 0 ? rankedKnowledgeItems : seededKnowledgeItems.slice(0, 50);
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
    saveReport(runId, markdown, detail) {
        const detailJson = detail ? JSON.stringify(detail) : null;
        this.db
            .prepare('INSERT OR REPLACE INTO reports (run_id, markdown, detail_json) VALUES (?, ?, ?)')
            .run(runId, markdown, detailJson);
    }
    getReport(runId) {
        const row = this.db.prepare('SELECT markdown FROM reports WHERE run_id = ?').get(runId);
        return row?.markdown;
    }
    getReportDetail(runId) {
        const row = this.db.prepare('SELECT detail_json FROM reports WHERE run_id = ?').get(runId);
        if (!row?.detail_json) {
            return undefined;
        }
        try {
            return JSON.parse(row.detail_json);
        }
        catch {
            return undefined;
        }
    }
    getRun(runId) {
        return this.db.prepare('SELECT * FROM fetch_runs WHERE id = ?').get(runId);
    }
    listRuns(limit = 20) {
        return this.db
            .prepare('SELECT id, created_at, figma_url, status, stage, stage_message, error, design_system_mode FROM fetch_runs ORDER BY id DESC LIMIT ?')
            .all(limit);
    }
    getDesignSystemFindings(runId) {
        const row = this.db
            .prepare('SELECT design_system_mode, design_system_findings FROM fetch_runs WHERE id = ?')
            .get(runId);
        if (!row?.design_system_findings) {
            return undefined;
        }
        try {
            return {
                mode: row.design_system_mode ?? 'generic',
                ...JSON.parse(row.design_system_findings)
            };
        }
        catch {
            return undefined;
        }
    }
    getToolCalls(runId) {
        return this.db
            .prepare('SELECT tool_name, status, raw_json, error FROM tool_calls WHERE run_id = ? ORDER BY id ASC')
            .all(runId);
    }
    createProject(name, description) {
        const result = this.db
            .prepare('INSERT INTO projects (name, description) VALUES (?, ?)')
            .run(name, description ?? null);
        return {
            id: result.lastInsertRowid,
            name,
            description: description ?? null
        };
    }
    listProjects() {
        return this.db
            .prepare('SELECT id, name, description, created_at FROM projects ORDER BY id DESC')
            .all();
    }
    addContextRule(input) {
        const status = input.status ?? 'draft';
        const result = this.db
            .prepare(`INSERT INTO context_rules (
          project_id, rule_id, category, statement, priority, authority, applies_to_json,
          validator_type, source, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(input.projectId, input.ruleId, input.category, input.statement, input.priority, input.authority, JSON.stringify(input.appliesTo ?? []), input.validatorType, input.source ?? null, status);
        return {
            id: result.lastInsertRowid,
            projectId: input.projectId,
            ruleId: input.ruleId,
            status
        };
    }
    listContextRules(projectId, status) {
        const rows = (status
            ? this.db
                .prepare(`SELECT id, project_id, rule_id, category, statement, priority, authority,
                    applies_to_json, validator_type, source, status
             FROM context_rules
             WHERE project_id = ? AND status = ?
             ORDER BY id ASC`)
                .all(projectId, status)
            : this.db
                .prepare(`SELECT id, project_id, rule_id, category, statement, priority, authority,
                    applies_to_json, validator_type, source, status
             FROM context_rules
             WHERE project_id = ?
             ORDER BY id ASC`)
                .all(projectId));
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
    approveContextRule(rulePkId) {
        this.db
            .prepare("UPDATE context_rules SET status = 'approved', updated_at = datetime('now') WHERE id = ?")
            .run(rulePkId);
    }
    createContextPack(input) {
        const status = input.status ?? 'draft';
        const version = input.version || 'v1';
        const ruleIds = input.ruleIds ?? [];
        const result = this.db
            .prepare('INSERT INTO context_packs (project_id, name, version, status, rule_ids_json) VALUES (?, ?, ?, ?, ?)')
            .run(input.projectId, input.name, version, status, JSON.stringify(ruleIds));
        return {
            id: result.lastInsertRowid,
            projectId: input.projectId,
            name: input.name,
            version,
            ruleIds,
            status
        };
    }
    getContextPack(packId) {
        const row = this.db
            .prepare('SELECT id, project_id, name, version, status, rule_ids_json FROM context_packs WHERE id = ?')
            .get(packId);
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
    createValidationRun(input) {
        const result = this.db
            .prepare(`INSERT INTO validation_runs (
          project_id, context_pack_id, target_tool, task_type, output_type, output_ref
        ) VALUES (?, ?, ?, ?, ?, ?)`)
            .run(input.projectId, input.contextPackId, input.targetTool, input.taskType, input.outputType, input.outputRef);
        return { id: result.lastInsertRowid };
    }
    completeValidationRun(runId, overallCompliance) {
        this.db
            .prepare("UPDATE validation_runs SET status = 'completed', overall_compliance = ?, completed_at = datetime('now') WHERE id = ?")
            .run(overallCompliance, runId);
    }
    failValidationRun(runId, error) {
        this.db
            .prepare("UPDATE validation_runs SET status = 'failed', error = ?, completed_at = datetime('now') WHERE id = ?")
            .run(error, runId);
    }
    saveValidationFindings(runId, findings) {
        const stmt = this.db.prepare(`INSERT INTO validation_findings (
         validation_run_id, rule_id, status, severity, confidence,
         evidence, recommendation, correction_prompt
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
        const insertMany = this.db.transaction((rows) => {
            for (const finding of rows) {
                stmt.run(runId, finding.ruleId, finding.status, finding.severity, finding.confidence, finding.evidence, finding.recommendation, finding.correctionPrompt);
            }
        });
        insertMany(findings);
    }
    getValidationFindings(runId) {
        const rows = this.db
            .prepare(`SELECT rule_id, status, severity, confidence, evidence, recommendation, correction_prompt
         FROM validation_findings
         WHERE validation_run_id = ?
         ORDER BY id ASC`)
            .all(runId);
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
    saveCorrectionPrompt(runId, targetTool, prompt) {
        this.db
            .prepare('INSERT INTO correction_prompts (validation_run_id, target_tool, prompt) VALUES (?, ?, ?)')
            .run(runId, targetTool, prompt);
    }
    getCorrectionPrompts(runId) {
        const rows = this.db
            .prepare(`SELECT id, target_tool, prompt, created_at
         FROM correction_prompts
         WHERE validation_run_id = ?
         ORDER BY id ASC`)
            .all(runId);
        return rows.map(row => ({
            id: row.id,
            targetTool: row.target_tool,
            prompt: row.prompt,
            createdAt: row.created_at
        }));
    }
    getValidationRunSummary(runId) {
        const row = this.db
            .prepare(`SELECT id, project_id, context_pack_id, status, target_tool, task_type,
                output_type, output_ref, overall_compliance, created_at, completed_at
         FROM validation_runs
         WHERE id = ?`)
            .get(runId);
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
