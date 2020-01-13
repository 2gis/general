import { WorkerMessage } from '../types';
export interface WorkerGlobalScope {
    onmessage: (event: {
        data: WorkerMessage;
    }) => void;
    postMessage: (message: any, transfer?: any[]) => void;
}
declare const _default: (self: WorkerGlobalScope) => void;
export default _default;
