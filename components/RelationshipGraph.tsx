import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Character } from '../types';
import * as apiService from '../services/apiService';
import { useI18n } from '../contexts/I18nContext';

interface RelationshipGraphProps {
    characters: Character[];
    onSelectCharacter: (characterId: string) => void;
}

// Helper to get the primary image URL from a character object efficiently
const getCharacterImageUrl = (char: Character) => {
    return char.portraits?.[0]?.imageUrl || char.portraits?.[0]?.outfits?.[0]?.imageUrl || null;
};

const GraphNodeImage: React.FC<{ x: number; y: number; r: number; imageKey: string | null; alt: string; isNpc: boolean }> = ({ x, y, r, imageKey, alt, isNpc }) => {
    const [url, setUrl] = useState<string | null>(null);
    
    useEffect(() => {
        let isCancelled = false;
        if (imageKey) {
            apiService.resolveImageUrl(imageKey).then(resolved => {
                if (!isCancelled) setUrl(resolved);
            });
        }
        return () => { isCancelled = true; };
    }, [imageKey]);

    const strokeColor = isNpc ? '#64748b' : '#38BDF8'; // slate-500 vs sky-400
    const strokeWidth = isNpc ? 2 : 3;

    return (
        <g transform={`translate(${x}, ${y})`}>
            <circle r={r} fill="#1E293B" stroke={strokeColor} strokeWidth={strokeWidth} />
            {url ? (
                <image
                    href={url}
                    x={-r}
                    y={-r}
                    height={r * 2}
                    width={r * 2}
                    clipPath={`circle(${r}px at ${r}px ${r}px)`}
                    preserveAspectRatio="xMidYMid slice"
                />
            ) : (
                <text textAnchor="middle" dy=".3em" fill="#94A3B8" fontSize={r} fontWeight="bold">
                    {alt.substring(0, 1).toUpperCase()}
                </text>
            )}
        </g>
    );
};

const RelationshipGraph: React.FC<RelationshipGraphProps> = ({ characters, onSelectCharacter }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const contentGroupRef = useRef<SVGGElement>(null);
    const simulationRef = useRef<d3.Simulation<any, undefined> | null>(null);
    
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [graphData, setGraphData] = useState<{ nodes: any[], links: any[] }>({ nodes: [], links: [] });
    const [animatedNodes, setAnimatedNodes] = useState<any[]>([]);
    const [animatedLinks, setAnimatedLinks] = useState<any[]>([]);
    
    const [hoveredNode, setHoveredNode] = useState<any | null>(null);
    const [hoveredLink, setHoveredLink] = useState<any | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    // Current Zoom Transform state (managed by D3, mirrored here for calculation if needed, but mainly we rely on D3's event)
    const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);

    const { t } = useI18n();

    // 1. Prepare Graph Data
    useEffect(() => {
        const nodesMap = new Map<string, any>();
        const links: any[] = [];

        // Add all current characters as nodes
        characters.forEach(char => {
            nodesMap.set(char.id, {
                id: char.id,
                name: char.name,
                isNpc: !!char.isNpc,
                imageKey: getCharacterImageUrl(char),
                group: 'current',
                // D3 force layout properties (optional initializers)
                x: 0, y: 0, vx: 0, vy: 0
            });
        });

        // Process links
        characters.forEach(char => {
            if (char.relationshipLinks) {
                char.relationshipLinks.forEach(rel => {
                    if (rel.targetId) {
                        // If target is in our list, link it.
                        if (nodesMap.has(rel.targetId)) {
                            links.push({
                                source: char.id,
                                target: rel.targetId,
                                label: rel.description
                            });
                        } else {
                            // Target is external (not in current filtered view).
                            // We create a placeholder node for them if we haven't already.
                            if (!nodesMap.has(rel.targetId)) {
                                nodesMap.set(rel.targetId, {
                                    id: rel.targetId,
                                    name: rel.targetName,
                                    isNpc: false, // Assume PC or unknown for external links
                                    imageKey: null,
                                    group: 'external',
                                    x: 0, y: 0, vx: 0, vy: 0
                                });
                            }
                            links.push({
                                source: char.id,
                                target: rel.targetId,
                                label: rel.description
                            });
                        }
                    }
                });
            }
        });

        setGraphData({
            nodes: Array.from(nodesMap.values()),
            links: links
        });

    }, [characters]);

    // 2. Handle Resize
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight || 600
                });
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 3. Initialize/Update Simulation
    useEffect(() => {
        if (!graphData.nodes.length) return;
        
        const width = dimensions.width;
        const height = dimensions.height;

        // If a simulation exists, stop it before creating a new one
        if (simulationRef.current) simulationRef.current.stop();

        const simulation = d3.forceSimulation(graphData.nodes)
            .force("link", d3.forceLink(graphData.links).id((d: any) => d.id).distance(180))
            .force("charge", d3.forceManyBody().strength(-500))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide(50));

        simulation.on("tick", () => {
            setAnimatedNodes([...simulation.nodes()]);
            setAnimatedLinks([...graphData.links]);
        });

        simulationRef.current = simulation;

        return () => { simulation.stop(); };
    }, [graphData, dimensions]); // Re-run if data or dims change radically

    // 4. Zoom Behavior
    useEffect(() => {
        if (!svgRef.current || !contentGroupRef.current) return;

        const svg = d3.select(svgRef.current);
        
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                transformRef.current = event.transform;
                d3.select(contentGroupRef.current).attr("transform", event.transform);
            });

        svg.call(zoom);
        // Initial center zoom could be added here if desired
    }, []);

    // 5. Interaction Handlers

    const draggedNodeRef = useRef<any>(null);

    const handlePointerDown = (event: React.PointerEvent, node: any) => {
        // Prevent the zoom behavior from taking over
        event.stopPropagation();
        
        // Capture pointer for smooth dragging outside the node
        (event.target as Element).setPointerCapture(event.pointerId);
        
        draggedNodeRef.current = node;
        setIsDragging(true);

        if (!simulationRef.current) return;
        
        // Heat up simulation
        simulationRef.current.alphaTarget(0.3).restart();
        
        // Fix position to current (prevents jumping)
        node.fx = node.x;
        node.fy = node.y;
    };

    const handlePointerMove = (event: React.PointerEvent) => {
        if (!draggedNodeRef.current || !simulationRef.current) return;

        // Calculate mouse position relative to SVG, adjusted by zoom transform
        const svgRect = svgRef.current?.getBoundingClientRect();
        if (!svgRect) return;

        const x = event.clientX - svgRect.left;
        const y = event.clientY - svgRect.top;

        // Apply inverse transform to get graph coordinates
        const transform = transformRef.current;
        const graphX = (x - transform.x) / transform.k;
        const graphY = (y - transform.y) / transform.k;

        draggedNodeRef.current.fx = graphX;
        draggedNodeRef.current.fy = graphY;
    };

    const handlePointerUp = (event: React.PointerEvent) => {
        if (draggedNodeRef.current && simulationRef.current) {
            (event.target as Element).releasePointerCapture(event.pointerId);
            
            if (!event.active) simulationRef.current.alphaTarget(0);
            
            draggedNodeRef.current.fx = null;
            draggedNodeRef.current.fy = null;
            
            draggedNodeRef.current = null;
            setIsDragging(false);
        }
    };

    const updateTooltipPos = (event: React.MouseEvent) => {
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
             setTooltipPos({
                x: event.clientX - containerRect.left,
                y: event.clientY - containerRect.top
             });
        }
    }

    const handleMouseEnter = (event: React.MouseEvent, node: any) => {
        if (isDragging) return;
        updateTooltipPos(event);
        setHoveredNode(node);
    };

    const handleMouseLeave = () => {
        setHoveredNode(null);
    };
    
    const handleNodeClick = (event: React.MouseEvent, nodeId: string) => {
        // Only trigger click if we weren't dragging
        if (!isDragging) {
            onSelectCharacter(nodeId);
        }
    };

    const handleLinkMouseEnter = (event: React.MouseEvent, link: any) => {
        if (isDragging) return;
        updateTooltipPos(event);
        setHoveredLink(link);
    };

    const handleLinkMouseLeave = () => {
        setHoveredLink(null);
    };

    return (
        <div ref={containerRef} className="w-full h-[600px] bg-slate-900/50 rounded-xl border border-secondary overflow-hidden relative">
            <svg 
                ref={svgRef}
                width="100%" 
                height="100%" 
                viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                className="cursor-move"
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                <defs>
                     <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#94A3B8" />
                    </marker>
                </defs>
                <g ref={contentGroupRef}>
                    {animatedLinks.map((link, i) => {
                        if (!link.source.x || !link.target.x) return null; // Wait for simulation
                        const midX = (link.source.x + link.target.x) / 2;
                        const midY = (link.source.y + link.target.y) / 2;
                        return (
                            <g 
                                key={`link-${i}`}
                                onMouseEnter={(e) => handleLinkMouseEnter(e, link)}
                                onMouseLeave={handleLinkMouseLeave}
                                className="cursor-pointer group"
                            >
                                {/* Invisible hit area line */}
                                <line
                                    x1={link.source.x}
                                    y1={link.source.y}
                                    x2={link.target.x}
                                    y2={link.target.y}
                                    stroke="transparent"
                                    strokeWidth="15"
                                />
                                {/* Visible Line */}
                                <line
                                    x1={link.source.x}
                                    y1={link.source.y}
                                    x2={link.target.x}
                                    y2={link.target.y}
                                    stroke="#475569"
                                    strokeWidth="1"
                                    markerEnd="url(#arrowhead)"
                                    className="group-hover:stroke-accent transition-colors"
                                />
                                <rect 
                                    x={midX - (link.label.length * 3)} 
                                    y={midY - 8} 
                                    width={link.label.length * 6 + 4} 
                                    height={16} 
                                    fill="#0F172A" 
                                    rx="4"
                                    opacity="0.8"
                                    className="pointer-events-none"
                                />
                                <text
                                    x={midX}
                                    y={midY}
                                    dy="0.3em"
                                    textAnchor="middle"
                                    fill="#94A3B8"
                                    fontSize="10"
                                    className="pointer-events-none"
                                >
                                    {link.label}
                                </text>
                            </g>
                        );
                    })}
                    {animatedNodes.map((node) => (
                        <g 
                            key={node.id} 
                            onPointerDown={(e) => handlePointerDown(e, node)}
                            onClick={(e) => handleNodeClick(e, node.id)}
                            onMouseEnter={(e) => handleMouseEnter(e, node)}
                            onMouseLeave={handleMouseLeave}
                            className={`${isDragging ? 'cursor-grabbing' : 'cursor-grab hover:opacity-80'} transition-opacity`}
                        >
                            <GraphNodeImage 
                                x={node.x} 
                                y={node.y} 
                                r={25} 
                                imageKey={node.imageKey} 
                                alt={node.name}
                                isNpc={node.isNpc}
                            />
                            <text
                                x={node.x}
                                y={node.y + 40}
                                textAnchor="middle"
                                fill={node.group === 'external' ? '#64748b' : '#E2E8F0'}
                                fontSize="12"
                                fontWeight="bold"
                                className="pointer-events-none shadow-black drop-shadow-md"
                                style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.8)' }}
                            >
                                {node.name} {node.group === 'external' ? '*' : ''}
                            </text>
                        </g>
                    ))}
                </g>
            </svg>
            
            {/* Node Tooltip */}
            {hoveredNode && (
                <div 
                    className="absolute z-20 pointer-events-none bg-slate-800 border border-slate-600 text-slate-200 p-2 rounded shadow-lg text-xs transform -translate-x-1/2 -translate-y-full mt-[-10px]"
                    style={{ left: tooltipPos.x, top: tooltipPos.y }}
                >
                    <p className="font-bold text-white text-sm mb-1">{hoveredNode.name}</p>
                    <div className="flex gap-1">
                        {hoveredNode.isNpc && <span className="px-1 bg-slate-700 border border-slate-500 rounded text-[10px]">NPC</span>}
                        {hoveredNode.group === 'external' && <span className="px-1 bg-amber-900/50 border border-amber-700 text-amber-200 rounded text-[10px]">External</span>}
                        {hoveredNode.group === 'current' && !hoveredNode.isNpc && <span className="px-1 bg-sky-900/50 border border-sky-700 text-sky-200 rounded text-[10px]">Character</span>}
                    </div>
                </div>
            )}

            {/* Link Tooltip */}
            {hoveredLink && !hoveredNode && (
                <div 
                    className="absolute z-20 pointer-events-none bg-slate-800 border border-slate-600 text-slate-200 p-2 rounded shadow-lg text-xs transform -translate-x-1/2 -translate-y-full mt-[-15px]"
                    style={{ left: tooltipPos.x, top: tooltipPos.y }}
                >
                    <p className="font-bold text-text-secondary text-[10px] mb-1 text-center uppercase tracking-wider">Relationship</p>
                    <div className="text-xs text-white mb-2 text-center font-semibold">
                        {hoveredLink.source.name} <span className="text-accent mx-1">→</span> {hoveredLink.target.name}
                    </div>
                    <p className="text-sm text-slate-300 text-center italic max-w-[200px] border-t border-slate-600 pt-1">
                        "{hoveredLink.label}"
                    </p>
                </div>
            )}

            <div className="absolute bottom-4 right-4 bg-black/60 p-2 rounded text-xs text-slate-400 pointer-events-none">
                * External/Unloaded Character
            </div>
        </div>
    );
};

export default RelationshipGraph;