import { WorkerMessage } from '../types';
import { generalize } from './generalize';

export interface WorkerGlobalScope {
    onmessage: (event: { data: WorkerMessage }) => void;
    postMessage: (message: any, transfer?: any[]) => void;
}

export default (self: WorkerGlobalScope) => {
    self.onmessage = (event) => {
        const data = event.data;
        generalize(data);
        self.postMessage(data.markers);
    };
};
