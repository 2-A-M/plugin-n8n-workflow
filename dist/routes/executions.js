import { getService, validateLimit } from './_helpers';
/**
 * GET /executions?workflowId=x&status=y&limit=z&cursor=c
 */
async function listExecutions(req, res, runtime) {
    try {
        const workflowId = req.query?.workflowId;
        const status = req.query?.status;
        const limit = validateLimit(req.query?.limit, 50, 250);
        const cursor = req.query?.cursor;
        const service = getService(runtime);
        const response = await service.listExecutions({ workflowId, status, limit, cursor });
        res.json({ success: true, data: response.data, nextCursor: response.nextCursor });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'failed_to_list_executions',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
/**
 * GET /executions/:id
 */
async function getExecution(req, res, runtime) {
    try {
        const id = req.params?.id;
        if (!id) {
            res.status(400).json({ success: false, error: 'execution_id_required' });
            return;
        }
        const service = getService(runtime);
        const execution = await service.getExecutionDetail(id);
        res.json({ success: true, data: execution });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'failed_to_fetch_execution',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
export const executionRoutes = [
    { type: 'GET', path: '/executions', handler: listExecutions },
    { type: 'GET', path: '/executions/:id', handler: getExecution },
];
//# sourceMappingURL=executions.js.map