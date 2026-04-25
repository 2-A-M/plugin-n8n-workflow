import { type IAgentRuntime, type Memory, type State } from '@elizaos/core';
export declare function buildConversationContext(message: Memory, state: State | undefined): string;
export declare function getUserTagName(runtime: IAgentRuntime, userId: string): Promise<string>;
//# sourceMappingURL=context.d.ts.map