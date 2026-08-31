import { RGA } from '../crdt-engine/src/index';
import type { Op, OpId } from '../crdt-engine/src/index';
import { CausalBuffer } from '../lib/sync-client';

export interface AgentConfig {
  siteId?: string;
  name?: string;
  autoRespond?: boolean;
}

export class CollaborativeAgent {
  readonly siteId: string;
  readonly name: string;
  private doc: RGA;
  private buffer: CausalBuffer;
  private autoRespond: boolean;
  private onEmitOp?: (op: Op) => void;

  constructor(config?: AgentConfig) {
    this.siteId = config?.siteId ?? `agent-${Math.random().toString(36).substring(2, 7)}`;
    this.name = config?.name ?? 'AI Collaborator';
    this.autoRespond = config?.autoRespond ?? false;
    this.doc = new RGA(this.siteId);
    this.buffer = new CausalBuffer();
  }

  setOpHandler(handler: (op: Op) => void): void {
    this.onEmitOp = handler;
  }

  /**
   * Receive and apply a remote operation from another human or agent peer
   */
  receiveOperation(op: Op): Op[] {
    const applied = [];
    if (this.buffer.tryApply(this.doc, op)) {
      applied.push(op);
    }
    const flushed = this.buffer.flush(this.doc);
    return [...applied, ...flushed];
  }

  /**
   * Get the current document text known to the agent
   */
  getText(): string {
    return this.doc.getText();
  }

  /**
   * Insert text as the agent at a specific visible character offset
   */
  insertText(offset: number, text: string): Op[] {
    const ops: Op[] = [];
    let cursor: OpId | null = offset === 0 ? null : this.doc.idAtVisibleOffset(offset);

    for (let i = 0; i < text.length; i++) {
      const op = this.doc.localInsert(cursor, text[i]);
      cursor = op.id;
      ops.push(op);
      this.onEmitOp?.(op);
    }
    return ops;
  }

  /**
   * Delete count characters starting at visible offset
   */
  deleteRange(offset: number, count: number): Op[] {
    const ops: Op[] = [];
    for (let i = 0; i < count; i++) {
      const targetId = this.doc.idAtVisibleOffset(offset + 1);
      if (targetId) {
        const op = this.doc.localDelete(targetId);
        ops.push(op);
        this.onEmitOp?.(op);
      }
    }
    return ops;
  }

  /**
   * Propose an automated suggestion or continuation
   */
  async generateCompletion(prompt?: string): Promise<string> {
    const currentDoc = this.getText();
    const suggestion = ` // [AI suggestion: ${prompt || currentDoc.slice(-20)}]`;
    this.insertText(currentDoc.length, suggestion);
    return suggestion;
  }
}

export default CollaborativeAgent;
