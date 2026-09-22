/**
 * Starter Document Templates Library for Braid.
 * Provides curated templates with pre-structured Notion-style blocks and code snippets.
 */

export interface TemplateItem {
  id: string;
  title: string;
  description: string;
  iconName: 'file-text' | 'cpu' | 'terminal' | 'users' | 'sparkles' | 'check-circle';
  tag: string;
  content: string;
}

export const DOCUMENT_TEMPLATES: TemplateItem[] = [
  {
    id: 'blank',
    title: 'Blank Canvas',
    description: 'Empty distraction-free workspace for creative freedom.',
    iconName: 'file-text',
    tag: 'General',
    content: '',
  },
  {
    id: 'rfc',
    title: 'Technical RFC',
    description: 'Architecture proposal, design decisions & system interfaces.',
    iconName: 'cpu',
    tag: 'Engineering',
    content: `# RFC: [Project / Feature Name]

> 💡 **Summary**: Brief one-paragraph description of the architectural proposal.

## 1. Context & Problem Statement
Describe the current limitations and why this change is necessary.

- Current bottleneck or limitation
- User or system impact
- Success metrics

## 2. Proposed Architecture
Detail the proposed system design and component interactions.

\`\`\`typescript
interface SystemInterface {
  id: string;
  execute(): Promise<void>;
}
\`\`\`

## 3. Alternative Approaches Considered
- **Option A**: Description and trade-offs.
- **Option B**: Description and trade-offs.

## 4. Rollout & Migration Plan
- [ ] Phase 1: Prototype and load testing
- [ ] Phase 2: Canary deployment
- [ ] Phase 3: General availability
`,
  },
  {
    id: 'code',
    title: 'Code Sandbox',
    description: 'Multi-language code block with syntax and live sync.',
    iconName: 'terminal',
    tag: 'Development',
    content: `# Multi-Language Collaborative Sandbox

> ℹ️ Write, review, and execute code snippets in real-time.

\`\`\`typescript
// Real-time collaborative TypeScript snippet
export function calculateFibonacci(n: number): number {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    const next = a + b;
    a = b;
    b = next;
  }
  return b;
}

console.log('Result:', calculateFibonacci(10));
\`\`\`

### Notes & Benchmarks
- Sub-millisecond convergence across distributed peers
- Conflict-free character insertion and deletion
`,
  },
  {
    id: 'meeting',
    title: 'Meeting Notes',
    description: 'Agenda, key discussion topics, decisions & action items.',
    iconName: 'users',
    tag: 'Productivity',
    content: `# Team Sync & Planning

**Date:** ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}  
**Attendees:** Alice, Bob, Charlie  

## 🎯 Meeting Objective
Align on sprint roadmap and key technical deliverables.

## 💬 Discussion Topics
- Review previous sprint retrospective
- Performance optimization milestones
- Real-time CRDT replication benchmarks

## ✅ Action Items
- [ ] Finalize WebSocket token auth flow
- [ ] Run benchmark load tests on 50 concurrent editors
- [ ] Prepare release notes for v1.0
`,
  },
];

export function getTemplateById(id: string): TemplateItem | undefined {
  return DOCUMENT_TEMPLATES.find((t) => t.id === id);
}
