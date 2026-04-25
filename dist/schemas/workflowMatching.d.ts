export declare const workflowMatchingSchema: {
    type: string;
    properties: {
        matchedWorkflowId: {
            type: string;
            nullable: boolean;
        };
        confidence: {
            type: string;
            enum: string[];
        };
        matches: {
            type: string;
            items: {
                type: string;
                properties: {
                    id: {
                        type: string;
                    };
                    name: {
                        type: string;
                    };
                    score: {
                        type: string;
                    };
                };
                required: string[];
            };
        };
        reason: {
            type: string;
        };
    };
    required: string[];
};
//# sourceMappingURL=workflowMatching.d.ts.map