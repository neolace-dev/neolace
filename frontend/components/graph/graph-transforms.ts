import { G6RawGraphData } from "components/graph/GraphViewer";
import { PropertyType, VNID } from "neolace-api";
import { GraphData, NodeType } from "./graph-data";
import {
    convertGraphToData,
    createGraphObject,
    GraphType,
    transformComputeCliques,
    transformComputeCommunities,
    transformCondenseGraph,
    transformCondenseNodeLeaves,
    transformExpandLeaves,
    transformHideNodesOfType,
} from "./graph-functions";

export interface Transform {
    id: string;
    params: Record<string, unknown>;
}

// NOTE assuming that transforms can only be applied once
export enum Transforms {
    CONDENSE = "condense",
    HIDETYPE = "hide-type",
    EXPANDLEAF = "expand-leaf",
    COMMUNITY = "community",
    CONDENSENODE = "condense-node",
    ADDCLIQUES = "add-cliques",
}

function condenseGraphData(currentData: G6RawGraphData, graph: GraphType) {
    // NOTE for now, we are performing node condensing relative to the "this" node of the graph.
    const focusNode = currentData.nodes.find((n) => n.isFocusEntry) ?? currentData.nodes[0];
    if (focusNode === undefined) {
        return graph; // Error - there are no nodes at all.
    }
    const condensedGraph = transformCondenseGraph(graph, focusNode.entryTypeKey);
    return condensedGraph;
}

export function applyTransforms(data: G6RawGraphData, transformList: Transform[]): Readonly<G6RawGraphData> {
    const dataCopy = JSON.parse(JSON.stringify(data));
    const originalDataGraph = createGraphObject(dataCopy);
    let transformedGraph = createGraphObject(dataCopy);
    let comm2id = new Map<number, string[]>();

    for (const t of transformList) {
        if (t.id === Transforms.CONDENSE) {
            // TODO Ideally, we shouldn't need to pass dataCopy into this function, or even make dataCopy at all.
            // condenseGraphData seems to only be using it to figure out which node is the "focus node",
            // and that attribute should be available on the graphology graph object just as it's available in the G6 data.
            transformedGraph = condenseGraphData(dataCopy, transformedGraph);
        } else if (t.id === Transforms.HIDETYPE) {
            transformedGraph = transformHideNodesOfType(transformedGraph, VNID(t.params.nodeType as string));
        } else if (t.id === Transforms.EXPANDLEAF) {
            transformedGraph = transformExpandLeaves(
                originalDataGraph,
                transformedGraph,
                t.params.parentKey as string[],
                t.params.entryType as string,
            );
        } else if (t.id === Transforms.CONDENSENODE) {
            transformedGraph = transformCondenseNodeLeaves(transformedGraph, t.params.nodeToCondense as string);
        } else if (t.id === Transforms.COMMUNITY) {
            // TODO: if there are certain constraints on the order of transforms, they should be maintained in the
            // transform list itself. For example, that cliques must come after communities, and communities must come
            // after other things. Mya also sort the list in a separate function.
            const result = transformComputeCommunities(transformedGraph);
            transformedGraph = result.simpleGraph;
            comm2id = result.comm2id;
        } else if (t.id === Transforms.ADDCLIQUES) {
            // if no community transform -> find cliques transform is not done.
            if (transformList.find((t) => t.id === Transforms.COMMUNITY) === undefined) continue;
            transformedGraph = transformComputeCliques(transformedGraph, comm2id);
        }
    }
    const finalData = convertGraphToData(transformedGraph);
    return finalData;
}

export interface GraphTransformer {
    (graphData: GraphData): void;
}



/**
 * When this transformer is active, it removes "placeholder" nodes from the graph. Those are the faded out nodes that
 * you can click on to load additional data into the graph.
 */
export const RemovePlaceholdersTransformer: GraphTransformer = (graphData) => {

    graphData.forEachNode((nodeId, attrs) => {
        if (attrs.type === NodeType.Placeholder) {
            graphData.dropNode(nodeId);
        }
    });
};


/**
 * Add extra data to each node and edge that is required for our "layout pipeline" to determine which layouts apply to
 * which nodes/edges. (We use DAGRE for the nodes/edges that have hierarchical relationships, then force for the rest.)
 * @param graphData 
 */
export const LayoutPipelineTransformer: GraphTransformer = (graphData) => {

    const relationshipTypes = graphData.getAttribute("relationshipTypes");

    graphData.forEachEdge((edgeId, attrs, source, target) => {
        if (attrs.isPlaceholder) {
            if (graphData.getNodeAttribute(source, "type") === NodeType.Placeholder) {
                graphData.mergeNodeAttributes(target, {_hasPlaceholder: true});
            } else {
                graphData.mergeNodeAttributes(source, {_hasPlaceholder: true});
            }
        }
        const relDetails = relationshipTypes[attrs.relTypeKey];
        if (relDetails?.type === PropertyType.RelIsA) {
            // This is an IS A relationship. Mark it and the nodes so that our layout algorithm knows this.
            graphData.mergeNodeAttributes(source, {_hasIsARelationship: true});
            graphData.mergeNodeAttributes(target, {_hasIsARelationship: true});
            graphData.mergeEdgeAttributes(edgeId, {_isIsARelationship: true});
        }
    });
};
