import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { StepEvent } from '../types';
import './StateGraph.css';

interface StateGraphProps {
  steps: StepEvent[];
  isActive: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function buildLabel(step: StepEvent): { label: string; detail: string } {
  switch (step.type) {
    case 'policy': {
      const action = step.action;
      if (action === 'CALL_TOOL') {
        return { label: 'Policy', detail: `CALL_TOOL → ${step.tool || ''}` };
      }
      return { label: 'Policy', detail: action };
    }
    case 'tool_executor':
      return { label: 'Tool', detail: step.summary.slice(0, 40) };
    case 'write_note':
      return { label: 'Note', detail: step.summary.slice(0, 40) };
    default:
      return { label: 'Step', detail: '' };
  }
}

const NODE_GAP_Y = 70;
const NODE_START_Y = 20;
const NODE_X = 80;

/** step 배열 → React Flow 노드/엣지 변환 (세로 레이아웃) */
function stepsToGraph(
  steps: StepEvent[],
  isActive: boolean,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  steps.forEach((step, i) => {
    const { label, detail } = buildLabel(step);
    const isLast = i === steps.length - 1;
    const nodeActive = isActive && isLast;

    nodes.push({
      id: `step-${i}`,
      position: { x: NODE_X, y: i * NODE_GAP_Y + NODE_START_Y },
      data: { label, detail, active: nodeActive },
      type: 'graphNode',
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    });

    if (i > 0) {
      edges.push({
        id: `edge-${i - 1}-${i}`,
        source: `step-${i - 1}`,
        target: `step-${i}`,
        animated: nodeActive,
      });
    }
  });

  return { nodes, edges };
}

/** 커스텀 노드 렌더러 */
function GraphNodeComponent({ data }: { data: { label: string; detail: string; active: boolean } }) {
  return (
    <div className={`graph-node ${data.active ? 'graph-node--active' : 'graph-node--done'}`}>
      <div className="graph-node__label">{data.label}</div>
      {data.detail && <div className="graph-node__detail">{data.detail}</div>}
    </div>
  );
}

const nodeTypes = { graphNode: GraphNodeComponent };

/** 노드 높이(패딩+텍스트) 추정값 */
const ESTIMATED_NODE_HEIGHT = 44;

export default function StateGraph({ steps, isActive, collapsed, onToggleCollapse }: StateGraphProps) {
  const { nodes, edges } = useMemo(
    () => stepsToGraph(steps, isActive),
    [steps, isActive],
  );

  const contentHeight =
    steps.length * NODE_GAP_Y + NODE_START_Y + ESTIMATED_NODE_HEIGHT + 20;

  if (steps.length === 0) return null;

  return (
    <div className={`state-graph-panel ${collapsed ? 'state-graph-panel--collapsed' : ''}`}>
      <div className="state-graph-panel__header">
        <span className="state-graph-panel__title">Agent Status</span>
        <button
          className="state-graph-panel__toggle"
          onClick={onToggleCollapse}
          aria-label={collapsed ? '펼치기' : '접기'}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`state-graph-panel__toggle-icon ${collapsed ? 'state-graph-panel__toggle-icon--collapsed' : ''}`}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
      {!collapsed && (
        <div className="state-graph-panel__body">
          <div style={{ width: '100%', height: `${contentHeight}px` }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              panOnDrag={false}
              zoomOnScroll={false}
              zoomOnPinch={false}
              zoomOnDoubleClick={false}
              minZoom={1}
              maxZoom={1}
              defaultViewport={{ x: 0, y: 0, zoom: 1 }}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={20} size={1} />
            </ReactFlow>
          </div>
        </div>
      )}
    </div>
  );
}
