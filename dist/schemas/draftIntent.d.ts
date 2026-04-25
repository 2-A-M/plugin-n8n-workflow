/**
 * JSON schema for LLM draft intent classification output
 */
export declare const draftIntentSchema: {
    type: string;
    properties: {
        intent: {
            type: string;
            enum: string[];
        };
        modificationRequest: {
            type: string;
            description: string;
        };
        reason: {
            type: string;
            description: string;
        };
    };
    required: string[];
};
//# sourceMappingURL=draftIntent.d.ts.map