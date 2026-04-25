import { workflowRoutes } from './workflows';
import { validationRoutes } from './validation';
import { nodeRoutes } from './nodes';
import { executionRoutes } from './executions';
export const n8nRoutes = [
    ...validationRoutes,
    ...workflowRoutes,
    ...nodeRoutes,
    ...executionRoutes,
];
//# sourceMappingURL=index.js.map